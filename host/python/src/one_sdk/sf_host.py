from typing import TYPE_CHECKING, Tuple
if TYPE_CHECKING:
	from one_sdk.app import WasiApp

import sys
import json
import functools

from wasmtime import Linker, FuncType, ValType

from one_sdk.handle_map import HandleMap
from one_sdk.error import WasiError, WasiErrno

# TODO: TypeAlias - needs 3.10
Ptr = int
Size = int
AbiResult = int

def _strace_inner(fn, name, *args):
	result = fn(*args)
	print(f"host: [strace] {name}{args} = {result}", file = sys.stderr)
	return result
def strace(fn, name):
	"""Use on a function to wrap with a debug print when called."""
	return functools.partial(_strace_inner, fn, name)

def _join_abi_result(lower: int, upper: int) -> AbiResult:
	lower = lower & 0x7FFFFFFF
	upper = (upper & 0x1) << 31

	return lower | upper
def _split_abi_result(value: AbiResult) -> Tuple[int, int]:
	lower = value & 0x7FFFFFFF
	upper = (value >> 31) & 0x1

	return (lower, upper)
def _abi_ok(value: int) -> AbiResult:
	return _join_abi_result(value, 0)
def _abi_err(value: int) -> AbiResult:
	return _join_abi_result(int(value), 1)

def link(linker: Linker, app: "WasiApp"):
	message_store: HandleMap[bytes] = HandleMap()

	def __export_message_exchange(msg_ptr: Ptr, msg_len: Size, out_ptr: Ptr, out_len: Size, ret_handle: Ptr) -> Size:
		memory = app.memory
		message = json.loads(
			memory.read_bytes(msg_ptr, msg_len).decode("utf-8")
		)
		response_bytes = json.dumps(app.handle_message(message)).encode("utf-8")

		message_handle = 0
		if len(response_bytes) > out_len:
			message_handle = message_store.insert(response_bytes)
		else:
			memory.write_bytes(out_ptr, out_len, response_bytes)
		
		memory.write_i32(ret_handle, message_handle)
		return _abi_ok(len(response_bytes))

	def __export_message_exchange_retrieve(handle: int, out_ptr: Ptr, out_len: Size) -> AbiResult:
		response_bytes = message_store.remove(handle)
		if response_bytes is None:
			return _abi_err(WasiErrno.EBADF)
		if out_len < len(response_bytes):
			return _abi_err(WasiErrno.ERANGE)
		
		count = app.memory.write_bytes(out_ptr, out_len, response_bytes)
		return _abi_ok(count)

	def __export_stream_read(handle: int, out_ptr: Ptr, out_len: Size) -> AbiResult:
		try:
			read_count = app.memory.write_bytes(out_ptr, out_len, app.stream_read(handle, out_len))
		except WasiError as e:
			return _abi_err(e.errno)
		
		return _abi_ok(read_count)
	
	def __export_stream_write(handle: int, in_ptr: Ptr, in_len: Size) -> AbiResult:
		try:
			write_count = app.stream_write(handle, app.memory.read_bytes(in_ptr, in_len))
		except WasiError as e:
			return _abi_err(e.errno)
		
		return _abi_ok(write_count)

	def __export_stream_close(handle: int) -> AbiResult:
		try:
			app.stream_close(handle)
		except WasiError as e:
			return _abi_err(e.errno)
		
		return _abi_ok(WasiErrno.SUCCESS)
	
	linker.define_func(
		"sf_host_unstable", "message_exchange",
		FuncType([ValType.i32(), ValType.i32(), ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
		__export_message_exchange
	)
	linker.define_func(
		"sf_host_unstable", "message_exchange_retrieve",
		FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
		__export_message_exchange_retrieve
	)
	linker.define_func(
		"sf_host_unstable", "stream_read",
		FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
		__export_stream_read
	)
	linker.define_func(
		"sf_host_unstable", "stream_write",
		FuncType([ValType.i32(), ValType.i32(), ValType.i32()], [ValType.i32()]),
		__export_stream_write
	)
	linker.define_func(
		"sf_host_unstable", "stream_close",
		FuncType([ValType.i32()], [ValType.i32()]),
		__export_stream_close
	)
