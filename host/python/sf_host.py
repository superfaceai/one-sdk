import json
import functools
from enum import IntEnum

from wasmtime import FuncType, ValType

def _strace_inner(fn, name, *args):
	result = fn(*args)
	print(f"host: [strace] {name}{args} = {result}")
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

class Errno(IntEnum):
	SUCCESS = 0
	TOOBIG = 1 # 2BIG
	ACCES = 2
	ADDRINUSE = 3
	ADDRNOTAVAIL = 4
	AFNOSUPPORT = 5
	AGAIN = 6
	ALREADY = 7
	BADF = 8
	BADMSG = 9
	BUSY = 10
	CANCELED = 11
	CHILD = 12
	CONNABORTED = 13
	CONNREFUSED = 14
	CONNRESET = 15
	DEADLK = 16
	DESTADDRREQ = 17
	DOM = 18
	DQUOT = 19
	EXIST = 20
	FAULT = 21
	FBIG = 22
	HOSTUNREACH = 23
	IDRM = 24
	ILSEQ = 25
	INPROGRESS = 26
	INTR = 27
	INVAL = 28
	IO = 29
	ISCONN = 30
	ISDIR = 31
	LOOP = 32
	MFILE = 33
	MLINK = 34
	MSGSIZE = 35
	MULTIHOP = 36
	NAMETOOLONG = 37
	NETDOWN = 38
	NETRESET = 39
	NETUNREACH = 40
	NFILE = 41
	NOBUFS = 42
	NODEV = 43
	NOENT = 44
	NOEXEC = 45
	NOLCK = 46
	NOLINK = 47
	NOMEM = 48
	NOMSG = 49
	NOPROTOOPT = 50
	NOSPC = 51
	NOSYS = 52
	NOTCONN = 53
	NOTDIR = 54
	NOTEMPTY = 55
	NOTRECOVERABLE = 56
	NOTSOCK = 57
	NOTSUP = 58
	NOTTY = 59
	NXIO = 60
	OVERFLOW = 61
	OWNERDEAD = 62
	PERM = 63
	PIPE = 64
	PROTO = 65
	PROTONOSUPPORT = 66
	PROTOTYPE = 67
	RANGE = 68
	ROFS = 69
	SPIPE = 70
	SRCH = 71
	STALE = 72
	TIMEDOUT = 73
	TXTBSY = 74
	XDEV = 75
	NOTCAPABLE = 76

def _join_u64(lower, upper):
	lower = lower & 0xFFFFFFFF
	upper = (upper & 0xFFFFFFFF) << 32

	return lower | upper
def _split_u64(value):
	lower = value & 0xFFFFFFFF
	upper = (value >> 32) & 0xFFFFFFFF

	return (lower, upper)
def _abi_ok(value):
	return _join_u64(value, 0)
def _abi_err(value):
	return _join_u64(int(value), 1)

class MessageStoage:
	def __init__(self):
		self.next_id = 1
		self.messages = dict()
	
	def store(self, message):
		handle = self.next_id
		self.next_id += 1

		self.messages[handle] = message
		return handle
	
	def get(self, handle):
		return self.messages.get(handle, None)
	
	def remove(self, handle):
		return self.messages.pop(handle, None)

def link(app):
	message_store = MessageStoage()

	def __export_message_exchange(msg_ptr, msg_len, out_ptr, out_len):
		# read UTF-8 JSON message from memory
		memory = app.memory_data()
		message_json = _read_bytes(memory, msg_ptr, msg_len).decode("utf-8")
		message = json.loads(message_json)

		# handle message using callback and UTF-8 JSON encode response
		print("host: Received message:", message)
		response = app.handle_message(message)
		print("host: Response message:", response)
		response_json = json.dumps(response).encode("utf-8")

		handle = 0
		response_size = len(response_json)
		if response_size > out_len:
			# output buffer is too small, store message and return the handle
			handle = message_store.store(response_json)
		else:
			# output buffer is big enough, write the message immediatelly
			# handle stays 0
			_write_bytes(memory, out_ptr, out_len, response_json)
		
		# return (size, handle)
		return _join_u64(response_size, handle)
	app.linker.define_func(
		"sf_host_unstable", "message_exchange",
		# exchange(msg_ptr, msg_len, out_ptr, out_len) -> (Size, Size)
		FuncType([ValType.i32(), ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i64()]),
		strace(__export_message_exchange, "sf_host_unstable::message_exchange")
	)

	def __export_message_exchange_retrieve(handle, out_ptr, out_len):		
		response_json = message_store.get(handle)

		# handle invalid handle
		if response_json is None:
			return _abi_err(Errno.BADF)
		
		# retrieve message, but don't delete it from store yet
		response_size = len(response_json)
		# handle buffer too small
		if response_size > out_len:
			# buffer too small, but we advised on size in exchange call
			return _abi_err(Errno.OVERFLOW)
		
		# write message to buffer
		memory = app.memory_data()
		_write_bytes(memory, out_ptr, out_len, response_json)

		# finally, remove the message from the store
		message_store.remove(handle)

		# return Ok(response_size)
		return _abi_ok(response_size)
	app.linker.define_func(
		"sf_host_unstable", "message_exchange_retrieve",
		# retrieve(handle, out_ptr, out_len) -> Result<Size, Errno>
		FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i64()]),
		strace(__export_message_exchange_retrieve, "sf_host_unstable::message_exchange_retrieve")
	)


	def __export_stream_read(handle, out_ptr, out_len):
		stream = app.streams.get(handle)
		if stream is None:
			# TODO: Err(errno) - choose which errno for invalid stream handle
			return _abi_err(Errno.BADF)
		
		try:
			data = stream.read(out_len)
		except ValueError:
			# ValueError means the stream was closed, for which posix usually returns BADF
			return _abi_err(Errno.BADF)
		except:
			# TODO: what error - not sure what other exceptions can be caught here and why
			return _abi_err(Errno.INVAL)
		print(f"host: Read {len(data)} bytes from stream {handle}")

		memory = app.memory_data()
		read_count = _write_bytes(memory, out_ptr, out_len, data)

		return _abi_ok(read_count)
	app.linker.define_func(
		"sf_host_unstable", "stream_read",
		# read(handle, out_ptr, out_len) -> Result<Size, Errno>
		FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i64()]),
		strace(__export_stream_read, "sf_host_unstable::stream_read")
	)

	def __export_stream_write(handle, in_ptr, in_len):
		stream = app.streams.get(handle)
		if stream is None:
			return _abi_err(Errno.BADF)

		memory = app.memory_data()
		data = _read_bytes(memory, in_ptr, in_len)
		
		try:
			write_count = stream.write(data)
		except ValueError:
			# ValueError means the stream was closed, for which posix usually returns BADF
			return _abi_err(Errno.BADF)
		except:
			# TODO: what error - not sure what other exceptions can be caught here and why
			return _abi_err(Errno.INVAL)
		
		print(f"host: Wrote {write_count} bytes to stream {handle}")
		return _abi_ok(write_count)
		
	app.linker.define_func(
		"sf_host_unstable", "stream_write",
		# write(handle, in_ptr, in_len) -> Result<Size, Errno>
		FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i64()]),
		strace(__export_stream_write, "sf_host_unstable::stream_write")
	)

	def __export_stream_close(handle):
		stream = app.streams.close(handle)
		if stream is None:
			return _abi_err(Errno.BADF)

		print(f"host: Closed stream {handle}")

		return _abi_ok(0)
	app.linker.define_func(
		"sf_host_unstable", "stream_close",
		# close(handle) -> Result<Size, Errno>
		FuncType([ValType.i32()], [ValType.i64()]),
		strace(__export_stream_close, "sf_host_unstable::stream_close")
	)
