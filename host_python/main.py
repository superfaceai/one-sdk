import sys
import json
import time
import base64
import functools

import http.client

from wasmtime import Engine, Store, Module, Linker, WasiConfig, FuncType, ValType

engine = Engine()

linker = Linker(engine)
linker.define_wasi()

STORE = Store(engine)

wasi = WasiConfig()
wasi.inherit_stdout()
wasi.inherit_stderr()
STORE.set_wasi(wasi)

ERRNO = {
	"SUCCESS": 0,
	"AGAIN": 6,
	"INVAL": 28
}
STREAM = {
	"perform": 100,
	"http": 101
}

STATE = {
	"perform": {
		"input": {
			"data": json.dumps({ "characterName": "Luke Skywalker" }).encode("utf-8"),
			"pos": 0
		},
		"result": {
			"data": b""
		}
	},
	"http": {
		"request": {
			"data": b""
		},
		"response": {
			"data": b"",
			"pos": 0,
			"pending": False
		}
	}
}
MEMORY = None

def _strace_inner(fn, name, *args):
	result = fn(*args)
	print(f"{name}{args} = {result}")
	return result
def strace(fn, name):
	return functools.partial(_strace_inner, fn, name)

def _write_bytes(ptr, offset, max_len, source_bytes):
	count = min(max_len, len(source_bytes))
	for i in range(count):
		ptr[offset + i] = source_bytes[i]
	
	return count
def _write_uint32(ptr, offset, value):
	return _write_bytes(ptr, offset, 4, value.to_bytes(4, byteorder = "little"))

def _read_bytes(ptr, offset, bytes_len):
	return bytes(ptr[offset : offset + bytes_len])

def sf_read(stream, buf_offset, buf_len, read_offset):
	stream_name = None
	state = None

	if (stream == STREAM["perform"]):
		stream_name = "perform"
		state = STATE["perform"]["input"]
	elif (stream == STREAM["http"]):
		stream_name = "perform"
		state = STATE["http"]["response"]

		if (state["pending"]):
			sys.stdout.flush()
			time.sleep(1)
			return ERRNO["AGAIN"]
	else:
		return ERRNO["INVAL"]

	memory = MEMORY.data_ptr(STORE)
	count = _write_bytes(memory, buf_offset, buf_len, state["data"][state["pos"]:])
	_write_uint32(memory, read_offset, count)

	state["pos"] += count

	print(f"sf_read({stream_name}) = {count}")
	return ERRNO["SUCCESS"]
linker.define_func(
	"superface_unstable", "sf_read",
	FuncType([ValType.i32(), ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
	strace(sf_read, "sf_read")
)

def sf_write(stream, buf_offset, buf_len, wrote_offset):
	stream_name = None
	state = None

	if (stream == STREAM["perform"]):
		stream_name = "perform"
		state = STATE["perform"]["result"]
	elif (stream == STREAM["http"]):
		stream_name = "perform"
		state = STATE["http"]["request"]

		if (STATE["http"]["response"]["pending"]):
			return ERRNO["AGAIN"]
	else:
		return ERRNO["INVAL"]
	
	memory = MEMORY.data_ptr(STORE)
	read = _read_bytes(memory, buf_offset, buf_len)
	state["data"] += read

	_write_uint32(memory, wrote_offset, len(read))
	
	print(f"sf_write({stream_name}) = {len(read)}")
	return ERRNO["SUCCESS"]
linker.define_func(
	"superface_unstable", "sf_write",
	FuncType([ValType.i32(), ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
	strace(sf_write, "sf_write")
)

def sf_flush(stream):
	if (stream == STREAM["perform"]):
		state = STATE["perform"]["input"]

		obj = json.loads(state["data"].decode("utf-8"))
		print("result:", obj)
	elif (stream == STREAM["http"]):
		state = STATE["http"]["response"]
		
		request = json.loads(STATE["http"]["request"]["data"].decode("utf-8"))
		print("request:", request)
		state["pending"] = True
		
		sys.stdout.flush()
		# TODO: async or something?
		connection = http.client.HTTPSConnection(request["base"])
		connection.request(request["method"], request["path"])
		response = connection.getresponse()

		response = {
			"status": response.status,
			"body": base64.b64encode(response.read()).decode("utf-8")
		}
		state["data"] = json.dumps(response).encode("utf-8")
		state["pos"] = 0
		state["pending"] = False

		print("response:", response)
	else:
		return ERRNO["INVAL"]

	return ERRNO["SUCCESS"]
linker.define_func(
	"superface_unstable", "sf_flush",
	FuncType([ValType.i32()], [ValType.i32()]),
	strace(sf_flush, "sf_flush")
)

mod1 = Module.from_file(engine, sys.argv[1])
mod1 = linker.instantiate(STORE, mod1)

MEMORY = mod1.exports(STORE)["memory"]
run = mod1.exports(STORE)["main"]

if len(sys.argv) > 2:
	STATE["perform"]["input"]["data"] = json.dumps({ "characterName": sys.argv[2] }).encode("utf-8")

run(STORE, 0, 0)
