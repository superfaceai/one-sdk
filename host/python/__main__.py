import functools
import requests
import sys
from collections import defaultdict
from wasmtime import Engine, Store, Module, Linker, WasiConfig, FuncType, ValType

engine = Engine()

linker = Linker(engine)
linker.define_wasi()

wasi = WasiConfig()
wasi.inherit_stdout()
wasi.inherit_stderr()
wasi.argv = sys.argv[2:] # skip running file name and core name
wasi.preopen_dir("integration/wasm/", "integration/wasm/")

STORE = Store(engine)
STORE.set_wasi(wasi)

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
	return functools.partial(_strace_inner, fn, name)
def _read_bytes(memory, ptr, len):
	return bytes(memory[ptr : ptr + len])
def _read_str(memory, ptr, len):
	return _read_bytes(memory, ptr, len).decode("utf-8")
def _write_bytes(memory, ptr, max_len, source_bytes):
	count = min(max_len, len(source_bytes))
	for i in range(count):
		memory[ptr + i] = source_bytes[i]
	return count

def __export_http_get(url_ptr, url_len, headers_ptr, headers_len):
	global STATE
	
	next_id = STATE["next_id"]
	STATE["next_id"] += 1

	memory = MEMORY.data_ptr(STORE)
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
linker.define_func(
	"sf_host_unstable", "http_get",
	FuncType([ValType.i32(), ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
	strace(__export_http_get, "http_get")
)

def __export_http_response_read(handle, out_ptr, out_len):
	response = STATE["requests"][handle]["request"].raw
	data = response.read(out_len)

	print(f"host: Read {len(data)} bytes:", data.decode("utf-8", errors = "replace"))
	
	memory = MEMORY.data_ptr(STORE)
	return _write_bytes(memory, out_ptr, out_len, data)
linker.define_func(
	"sf_host_unstable", "http_response_read",
	FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
	strace(__export_http_response_read, "http_response_read")
)

module = Module.from_file(engine, sys.argv[1])
module = linker.instantiate(STORE, module)
MEMORY = module.exports(STORE)["memory"]

# WASI exports _start functin, which is wrapper similarly used in C to init program execution
run = module.exports(STORE)["_start"]
return_code = run(STORE)

print("host: result:", return_code)
