import time
import functools
import requests
import sys
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

		url = msg["url"]
		headers = msg["headers"]
		print(f"host: Making GET request to {url} with headers {headers}")

		# TODO: have to join to use this library
		# we can use raw(er) http.client later
		headers_joined = dict()
		for key, value in headers.items():
			headers_joined[key] = ",".join(value)

		response = requests.get(
			url, headers = headers_joined, stream = True
		)
		self.requests[handle] = {
			"response": response,
			"response_stream_handle": self.streams.register(response.raw, lambda: self._cleanup_http(handle))
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
	def __init__(self):
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
		self.wasi.inherit_stdout()
		self.wasi.inherit_stderr()
		# self.wasi.argv = argv
		# self.wasi.preopen_dir("integration/wasm/", "integration/wasm/")
		self.store.set_wasi(self.wasi)

		# module managers
		self.streams = StreamManager()
		self.http = HttpManager(self.streams)
		self.fs = FsManager(self.streams)

		# perform state
		self.perform_map = None
		self.perform_input = None
		self.perform_output = None

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

	def perform(self, map_name, input_value = None):
		self.perform_map = map_name
		self.perform_input = input_value
		self.fn_perform(self.store)
		self.perform_input = None
		self.perform_map = None

		output = self.perform_output
		self.perform_output = None
		return output

	def memory_data(self):
		return self.memory.data_ptr(self.store)

	def handle_message(self, message):
		if message["kind"] == "perform-input":
			return { "kind": "ok", "map_name": self.perform_map, "map_input": self.perform_input }
		if message["kind"] == "perform-output":
			self.perform_output = message["map_result"]
			return { "kind": "ok" }

		if message["kind"] == "http-call":
			return self.http.http_call(message)
		if message["kind"] == "http-call-head":
			return self.http.http_call_retrieve_head(message)
		
		if message["kind"] == "file-open":
			return self.fs.file_open(message)

		return "Unknown message"

	def debug_ensure_no_leaks(self):
		"""
		Ensure that all streams are closed and that there are no dangling http requests.
		"""

		leaks = []

		if not self.streams._debug_ensure_no_leaks():
			leaks.append("streams")
			print("streams:", self.streams)
		if not self.http._debug_ensure_no_leaks():
			leaks.append("http")
			print("http:", self.http)
		if not self.fs._debug_ensure_no_leaks():
			leaks.append("fs")
			print("fs:", self.fs)
		if not (self.perform_map is None and self.perform_input is None and self.perform_output is None):
			leaks.append("perform")
			print(f"perform: ({self.perform_input}, {self.perform_map}, {self.perform_output})")
		
		if len(leaks) > 0:
			raise RuntimeError("Leaks were found in: " + ", ".join(leaks))
		

MAP_NAME = sys.argv[2]  # skip running file name and core name
APP = App()

sf_host.link(APP)
APP.load_wasi_module(sys.argv[1])

with APP as app:
	print("host: ==================================================")
	print("host: result:", app.perform(MAP_NAME, { "person": 1 }))
	print("host: ==================================================")
	debug_stream = app.streams.register(SimpleNamespace(close = lambda: None))
	print("host: result2:", app.perform(MAP_NAME, { "person": 2, "debug_stream": { "$StructuredValue::Stream": debug_stream } }))
	print("host: ==================================================")

	print("host: waiting 5 seconds to trigger recache...")
	time.sleep(5)
	print("host: result3:", app.perform(MAP_NAME, 3))
	print("host: ==================================================")
