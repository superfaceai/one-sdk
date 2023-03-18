import time
import functools
import requests
from collections import defaultdict
from wasmtime import Engine, Store, Module, Linker, WasiConfig, FuncType, ValType

from types import SimpleNamespace

import sf_host

class StreamManager:
	def __init__(self):
		self.next_id = 1
		self.streams = dict()
	
	def __repr__(self):
		return str(self.streams)
	
	def register(self, stream, close_hook = None):
		handle = self.next_id
		self.next_id += 1

		self.streams[handle] = { "stream": stream, "close_hook": close_hook }
		return handle
	
	def get(self, handle):
		state = self.streams.get(handle, None)
		if state is None:
			return None
		
		return state["stream"]
		
	def close(self, handle):
		state = self.streams.pop(handle, None)
		if state is None:
			return None
		
		close_hook = state["close_hook"]
		if close_hook is not None:
			close_hook()
		return state["stream"]
	
	def _debug_ensure_no_leaks(self):
		return len(self.streams) == 0

class HttpManagerResponseStream:
	def __init__(self, response):
		# we use iter_content to get automatic content-encoding decoding
		# otherwise we will have to decode manually in core
		self.chunk_iter = response.iter_content(None)
		self.partial = None
	
	def read(self, out_len):
		# self.chunk_iter can return any chunk size when content-encoding is involved
		# because requests can only be told how much to read from the response stream, not how much data
		# to return after decoding
		#
		# hence here we have to store partial chunks and handle cases where out_len < len(chunk)
		chunk = None
		if self.partial is not None:
			chunk = self.partial
			self.partial = None
		else:
			try:
				chunk = next(self.chunk_iter)
			except StopIteration:
				return b''
		
		if len(chunk) > out_len:
			self.partial = chunk[out_len:]
			chunk = chunk[:out_len]
		
		return chunk
class HttpManager:
	def __init__(self, streams):
		self.next_id = 1
		self.requests = dict()

		self.streams = streams
	
	def __repr__(self):
		return str(self.requests)

	def http_call(self, msg):
		handle = self.next_id
		self.next_id += 1

		method = msg["method"]
		url = msg["url"]
		headers = msg["headers"]
		body = msg["body"]
		if body is not None:
			body = bytes(body)
		sf_host.log(f"host: Making {method} request to {url} with headers={headers}, len(body)={len(body) if body is not None else 0}")

		# TODO: have to join headers to use this library - we can use raw(er) http.client later
		headers_joined = dict()
		for key, value in headers.items():
			headers_joined[key] = ",".join(value)

		response = requests.request(
			method, url, headers = headers_joined, data = body, stream = True
		)
		self.requests[handle] = {
			"response": response,
			"response_stream_handle": self.streams.register(
				HttpManagerResponseStream(response),
				lambda: self._cleanup_http(handle)
			)
		}

		return { "kind": "ok", "handle": handle }

	def http_call_retrieve_head(self, msg):
		handle = msg["handle"]
		if handle not in self.requests:
			return { "kind": "err", "error": "Invalid request handle" }
		
		response = self.requests[handle]["response"]
		status = response.status_code
		headers = response.headers
		body_handle = self.requests[handle]["response_stream_handle"]

		# transform headers into map[str, list[str]]
		headers_multi = defaultdict(list)
		for key, value in headers.items():
			headers_multi[key].append(value)

		return { "kind": "ok", "status": status, "headers": headers_multi, "body_stream": body_handle }
	
	def _cleanup_http(self, handle):
		del self.requests[handle]
	
	def _debug_ensure_no_leaks(self):
		return len(self.requests) == 0

class FsManager:
	def __init__(self, streams):
		self.streams = streams
	
	def file_open(self, msg):
		path = msg["path"]
		mode = "b"

		if msg["create_new"] == True:
			mode += "x"
		elif msg["create"] == True:
			pass # no idea?

		if msg["truncate"] == True:
			mode += "w"
		elif msg["append"] == True:
			mode += "a"
		elif msg["write"] == True:
			mode += "+"
		elif msg["read"] == True:
			mode += "r"
		
		handle = self.streams.register(open(path, mode))

		return { "kind": "ok", "stream": handle }
	
	def _debug_ensure_no_leaks(self):
		# we don't store metadata about files, so we defer to stream manager
		return True

class App:
	def __init__(
		self,
		stdin = None, stdout = "inherit", stderr = "inherit",
		http_manager = HttpManager
	):
		self.engine = Engine()
		self.linker = Linker(self.engine)
		self.store = Store(self.engine)
		self.module = None
		self.memory = None

		self.fn_setup = None
		self.fn_teardown = None
		self.fn_perform = None

		# prepare wasi context
		self.linker.define_wasi()

		self.wasi = WasiConfig()
		self.wasi.inherit_env()
		# stdin
		if stdin == "inherit":
			self.wasi.inherit_stdin()
		elif stdin is not None:
			self.wasi.stdin_file = stdin
		# stdout
		if stdout == "inherit":
			self.wasi.inherit_stdout()
		elif stdout is not None:
			self.wasi.stdout_file = stdout
		# stderr
		if stderr == "inherit":
			self.wasi.inherit_stderr()
		elif stderr is not None:
			self.wasi.stderr_file = stderr
		self.store.set_wasi(self.wasi)
		# module managers
		self.streams = StreamManager()
		self.http = http_manager(self.streams)
		self.fs = FsManager(self.streams)

		# perform state
		self.perform_state = None

		sf_host.link(self)

	def load_wasi_module(self, path):
		module = Module.from_file(self.engine, path)
		self.module = self.linker.instantiate(self.store, module)
		self.memory = self.module.exports(self.store)["memory"]
		# our WASI module exports these functions
		self.fn_setup = self.module.exports(self.store)["superface_core_setup"]
		self.fn_teardown = self.module.exports(self.store)["superface_core_teardown"]
		self.fn_perform = self.module.exports(self.store)["superface_core_perform"]

	def __enter__(self):
		self.fn_setup(self.store)
		return self
	
	def __exit__(self, exc_type, exc_value, traceback):
		self.fn_teardown(self.store)
		self.debug_ensure_no_leaks()

	def perform(
		self,
		map_name,
		map_usecase,
		map_input = None,
		map_parameters = None,
		map_security = None
	):
		self.perform_state = {
			"map_name": map_name,
			"map_usecase": map_usecase,
			"map_input": map_input,
			"map_parameters": map_parameters,
			"map_security": map_security,
			"map_output": None
		}
		self.fn_perform(self.store)
		output = self.perform_state["map_output"]
		self.perform_state = None
		return output

	def memory_data(self):
		return self.memory.data_ptr(self.store)

	def handle_message(self, message):
		if message["kind"] == "perform-input":
			return {
				"kind": "ok",
				"map_name": self.perform_state["map_name"],
				"map_usecase": self.perform_state["map_usecase"],
				"map_input": self.perform_state["map_input"],
				"map_parameters": self.perform_state["map_parameters"],
				"map_security": self.perform_state["map_security"]
			}
		if message["kind"] == "perform-output":
			self.perform_state["map_output"] = message["map_result"]
			return { "kind": "ok" }

		if message["kind"] == "http-call":
			return self.http.http_call(message)
		if message["kind"] == "http-call-head":
			return self.http.http_call_retrieve_head(message)
		
		if message["kind"] == "file-open":
			return self.fs.file_open(message)

		return "Unknown message"
	
	def get_stream(self, handle):
		return self.streams.get(handle)
	
	def close_stream(self, handle)
		return self.streams.close(handle) is not None

	def debug_ensure_no_leaks(self):
		"""
		Ensure that all streams are closed and that there are no dangling http requests.
		"""

		leaks = []

		if not self.streams._debug_ensure_no_leaks():
			leaks.append("streams")
			sf_host.log("streams:", self.streams)
		if not self.http._debug_ensure_no_leaks():
			leaks.append("http")
			sf_host.log("http:", self.http)
		if not self.fs._debug_ensure_no_leaks():
			leaks.append("fs")
			sf_host.log("fs:", self.fs)
		if self.perform_state is not None:
			leaks.append("perform")
			sf_host.log(f"perform: {self.perform_state}")
		
		if len(leaks) > 0:
			raise RuntimeError("Leaks were found in: " + ", ".join(leaks))
