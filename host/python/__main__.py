import functools
import requests
import sys
from collections import defaultdict
from wasmtime import Engine, Store, Module, Linker, WasiConfig, FuncType, ValType

import sf_host

class StreamManager:
	def __init__(self):
		self.next_id = 1
		self.streams = dict()
	
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
		
		state["close_hook"]()
		return state["stream"]

class HttpManager:
	def __init__(self, streams):
		self.next_id = 1
		self.requests = dict()

		self.streams = streams

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

		return { "kind": "ok", "status": status, "headers": headers_multi, "body_handle": body_handle }
	
	def _cleanup_http(self, handle):
		del self.requests[handle]

class App:
	def __init__(self, argv):
		self.engine = Engine()
		self.linker = Linker(self.engine)
		self.store = Store(self.engine)
		self.module = None
		self.memory = None
		self.entry = None

		# prepare wasi context
		self.linker.define_wasi()

		self.wasi = WasiConfig()
		self.wasi.inherit_stdout()
		self.wasi.inherit_stderr()
		self.wasi.argv = argv
		self.wasi.preopen_dir("integration/wasm/", "integration/wasm/")
		self.store.set_wasi(self.wasi)

		# module managers
		self.streams = StreamManager()
		self.http = HttpManager(self.streams)

	def load_wasi_module(self, path):
		module = Module.from_file(self.engine, path)
		self.module = self.linker.instantiate(self.store, module)
		self.memory = self.module.exports(self.store)["memory"]
		# WASI exports _start functin, which is wrapper similarly used in C to init program execution
		self.entry = self.module.exports(self.store)["_start"]

	def run(self):
		return self.entry(self.store)

	def memory_data(self):
		return self.memory.data_ptr(self.store)

	def handle_message(self, message):
		if message["kind"] == "http-call":
			return self.http.http_call(message)
		if message["kind"] == "http-call-head":
			return self.http.http_call_retrieve_head(message)

		return { "error": "Unknown message" }


APP = App(sys.argv[2:]) # skip running file name and core name

sf_host.link(APP)
APP.load_wasi_module(sys.argv[1])
return_code = APP.run()

print("host: result:", return_code)
