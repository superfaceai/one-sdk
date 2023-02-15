import json
import functools

from wasmtime import FuncType, ValType

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
def _write_bytes(memory, ptr, max_len, source_bytes):
	"""Write up to `max_len` bytes from `source_bytes` to `ptr`."""
	count = min(max_len, len(source_bytes))
	for i in range(count):
		memory[ptr + i] = source_bytes[i]
	return count

def _join_u64(lower, upper):
	lower = lower & 0xFFFFFFFF
	upper = (upper & 0xFFFFFFFF) << 32

	return lower | upper
def _split_u64(value):
	lower = value & 0xFFFFFFFF
	upper = (value >> 32) & 0xFFFFFFFF

	return (lower, upper)

MESSAGE_STORAGE = {
	"next_id": 1,
	"messages": {}
}

def link(app):
	def __export_message_exchange(msg_ptr, msg_len, out_ptr, out_len):
		# read UTF-8 JSON message from memory
		memory = app.memory_data()
		message_json = _read_bytes(memory, msg_ptr, msg_len).decode("utf-8")
		message = json.loads(message_json)

		# handle message using callback and UTF-8 JSON encode response
		response = app.handle_message(message)
		response_json = json.dumps(response).encode("utf-8")

		handle = 0
		response_size = len(response_json)
		if response_size > out_len:
			# output buffer is too small, store message and return the handle
			global MESSAGE_STORAGE

			handle = MESSAGE_STORAGE.next_id
			MESSAGE_STORAGE.next_id += 1
			MESSAGE_STORAGE.messages[next_id] = response_json
		else:
			# output buffer is big enough, write the message immediatelly
			# handle stays 0
			_write_bytes(memory, out_ptr, out_len, response_json)
		
		# return (size, handle)
		return _join_u64(response_size, handle)

	def __export_message_exchange_retrieve(handle, out_ptr, out_len):
		global MESSAGE_STORAGE

		# handle invalid handle
		if handle not in MESSAGE_STORAGE.messages:
			# TODO: Err(errno) - choose which errno for invalid handle
			# return Err(1)
			return _join_u64(1, 1)
		
		# retrieve message, but don't delete it from store yet
		response_json = MESSAGE_STORAGE.messages[handle]
		response_size = len(response_json)
		# handle buffer too small
		if response_size > out_len:
			# TODO: Err(errno) - choose which errno for invalid argument (buffer too small, but we advised on size in exchange call)
			# return Err(2)
			return _join_u64(2, 1)
		
		# write message to buffer
		memory = app.memory_data()
		_write_bytes(memory, out_ptr, out_len, response_json)

		# finally, remove the message from the store
		del MESSAGE_STORAGE.messages[handle]

		# return Ok(response_size)
		return _join_u64(response_size, 0)

	app.linker.define_func(
		"sf_host_unstable", "message_exchange",
		# exchange(msg_ptr, msg_len, out_ptr, out_len) -> (Size, Size)
		FuncType([ValType.i32(), ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i64()]),
		strace(__export_message_exchange, "sf_host_unstable::message_exchange")
	)

	app.linker.define_func(
		"sf_host_unstable", "message_exchange_retrieve",
		# retrieve(handle, out_ptr, out_len) -> Result<Size, Errno>
		FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i64()]),
		strace(__export_message_exchange_retrieve, "sf_host_unstable::message_exchange_retrieve")
	)
