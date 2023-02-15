import functools
import requests
import sys
from collections import defaultdict
from wasmtime import Engine, Store, Module, Linker, WasiConfig, FuncType, ValType

import sf_host

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
		print("Received message:", message)
		return { "response_handle": 123 }


APP = App(sys.argv[2:]) # skip running file name and core name

STATE = {
	"next_id": 0,
	"requests": {
		# <id>: {
		# 	url: <url>,
		# 	headers: { <key>: <[values]> },
		# 	request: <request>
		# }
	}
}

def _strace_inner(fn, name, *args):
	result = fn(*args)
	print(f"host: {name}{args} = {result}")
	return result
def strace(fn, name):
	"""Use on a function to wrap with a debug print when called."""
	return functools.partial(_strace_inner, fn, name)

def _read_bytes(memory, ptr, len):
	"""Read exactly `len` bytes from `ptr`."""
	return bytes(memory[ptr : ptr + len])
def _read_str(memory, ptr, len):
	"""Read exactly `len` bytes from `ptr` and interpret it as utf-8 string."""
	return _read_bytes(memory, ptr, len).decode("utf-8")
def _write_bytes(memory, ptr, max_len, source_bytes):
	"""Write up to `max_len` bytes from `source_bytes` to `ptr`."""
	count = min(max_len, len(source_bytes))
	for i in range(count):
		memory[ptr + i] = source_bytes[i]
	return count

def __export_http_get(url_ptr, url_len, headers_ptr, headers_len):
	global STATE
	
	next_id = STATE["next_id"]
	STATE["next_id"] += 1

	memory = APP.memory_data()
	url = _read_str(memory, url_ptr, url_len)
	
	headers = defaultdict(list)
	# header-key:header-value\nheader-key:header-value
	headers_str = _read_str(memory, headers_ptr, headers_len)
	for header_str in filter(lambda s: len(s) != 0, headers_str.split("\n")):
		key, value = header_str.split(":")
		headers[key].append(value)

	# TODO: have to join to use this library
	# we can use raw(er) http.client later
	headers_joined = dict()
	for key, value in headers.items():
		headers_joined[key] = ",".join(value)
	
	print(f"host: Making GET request to {url} with headers {headers}")
	STATE["requests"][next_id] = {
		"url": url,
		"headers": headers,
		"request": requests.get(url, headers = headers_joined, stream = True)
	}

	return next_id
APP.linker.define_func(
	"sf_host_unstable", "http_get",
	FuncType([ValType.i32(), ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
	strace(__export_http_get, "http_get")
)

def __export_http_response_read(handle, out_ptr, out_len):
	response = STATE["requests"][handle]["request"].raw
	data = response.read(out_len)

	print(f"host: Read {len(data)} bytes:", data.decode("utf-8", errors = "replace"))
	
	memory = APP.memory_data()
	return _write_bytes(memory, out_ptr, out_len, data)
APP.linker.define_func(
	"sf_host_unstable", "http_response_read",
	FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
	strace(__export_http_response_read, "http_response_read")
)

sf_host.link(APP)
APP.load_wasi_module(sys.argv[1])
return_code = APP.run()

print("host: result:", return_code)
