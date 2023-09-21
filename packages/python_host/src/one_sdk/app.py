import importlib.metadata as metadata
import os
import platform
import sys

from typing import Any, BinaryIO, Callable, List, Mapping, Optional, cast

import struct
from types import SimpleNamespace
from dataclasses import dataclass
import functools

from wasmtime import Engine, Instance, Memory, Store, Module, Linker, WasiConfig
import wasmtime

from one_sdk.handle_map import HandleMap
from one_sdk.sf_host import Ptr, Size, link as sf_host_link
from one_sdk.error import HostError, ErrorCode, PerformError, ValidationError, UnexpectedError, UninitializedError, WasiError, WasiErrno
from one_sdk.platform import PythonFilesystem, PythonNetwork, PythonPersistence, DeferredHttpResponse, HttpResponse

# TODO: TypeAlias - needs 3.10
SecurityValuesMap = Mapping[str, Mapping[str, str]]

class WasiMemory:
	"""Pointer to Wasi Memory - do not store this between calls to WASM as it might get invalidated"""
	def __init__(self, data_ptr):
		self.data_ptr = data_ptr

	def read_bytes(self, in_ptr: Ptr, in_len: Size) -> bytes:
		"""Read exactly `in_len` bytes from the memory at `in_ptr`."""
		return bytes(self.data_ptr[in_ptr : in_ptr + in_len])

	def write_bytes(self, out_ptr: Ptr, out_len: Size, data: bytes) -> int:
		"""Write up to `out_len` bytes from `data` to `out_ptr`."""
		count = min(out_len, len(data))
		for i in range(count):
			self.data_ptr[out_ptr + i] = data[i]
		
		return count
	
	def read_i32(self, in_ptr: Ptr) -> int:
		return struct.unpack("<i", self.read_bytes(in_ptr, 4))[0]

	def write_i32(self, out_ptr: Ptr, value: int):
		# pack as little endian signed integer
		# see https://docs.python.org/3/library/struct.html#byte-order-size-and-alignment
		self.write_bytes(out_ptr, 4, struct.pack("<i", value))

class WasiApp:
	@dataclass
	class _AppCore:
		instance: Instance
		setup_fn: Callable[[], None]
		teardown_fn: Callable[[], None]
		perform_fn: Callable[[], None]
		get_metrics_fn: Callable[[], int]
		clear_metrics_fn: Callable[[], None]
		get_devleoper_dump_fn: Callable[[], int]
	
	@dataclass
	class _PerformState:
		profile_url: str
		provider_url: str
		map_url: str
		usecase: str
		input: Any
		parameters: Mapping[str, str]
		security: SecurityValuesMap
		result: Optional[Any] = None
		error: Optional[PerformError] = None
		exception: Optional[UnexpectedError] = None

	def __init__(
		self,
		filesystem: PythonFilesystem,
		network: PythonNetwork,
		persistence: PythonPersistence
	):
		self._engine = Engine()
		self._linker = Linker(self._engine)
		self._store = Store(self._engine)

		# linked modules and state
		self._linker.define_wasi()
		sf_host_link(self._linker, self)

		wasi = WasiConfig()
		wasi.inherit_stdout()
		wasi.inherit_stderr()
		wasi.env = [*os.environ.items(), ('ONESDK_DEFAULT_USERAGENT', WasiApp.user_agent())]
		
		self._store.set_wasi(wasi)
		self._streams: HandleMap[BinaryIO] = HandleMap()
		self._requests: HandleMap[DeferredHttpResponse] = HandleMap()

		# dependencies
		self._filesystem = filesystem
		self._network = network
		self._persistence = persistence

		# loaded when core is loaded
		self._module: Optional[Module] = None
		self._core: Optional[WasiApp._AppCore] = None
		self._perform_state: Optional[WasiApp._PerformState] = None

	def _memory_from_core(self, core: "WasiApp._AppCore") -> WasiMemory:
		memory = cast(Memory, core.instance.exports(self._store)["memory"])
		ptr = memory.data_ptr(self._store)

		return WasiMemory(ptr)

	@property
	def memory(self) -> WasiMemory:
		if self._core is None:
			raise UninitializedError()

		return self._memory_from_core(self._core)

	def handle_message(self, message: Any) -> Any:
		if self._perform_state is None:
			raise UnexpectedError("UnexpectedError", "Unexpected perform state")
		
		if message["kind"] == "perform-input":
			return {
				"kind": "ok",
				"profile_url": self._perform_state.profile_url,
				"provider_url": self._perform_state.provider_url,
				"map_url": self._perform_state.map_url,
				"usecase": self._perform_state.usecase,
				"map_input": self._perform_state.input,
				"map_parameters": self._perform_state.parameters,
				"map_security": self._perform_state.security,
			}
		elif message["kind"] == "perform-output-result":
			self._perform_state.result = message["result"]
			return { "kind": "ok" }
		elif message["kind"] == "perform-output-error":
			self._perform_state.error = PerformError(message["error"])
			return { "kind": "ok" }
		elif message["kind"] == "perform-output-exception":
			if message["exception"]["error_code"] == "InputValidationError":
				self._perform_state.exception = ValidationError(message["exception"]["message"])
			else:
				self._perform_state.exception = UnexpectedError(message["exception"]["error_code"], message["exception"]["message"])
			return { "kind": "ok" }
		elif message["kind"] == "file-open":
			try:
				file_handle = self._filesystem.open(
					message["path"],
					create_new = message["create_new"],
					create = message["create"],
					truncate = message["truncate"],
					append = message["append"],
					write = message["write"],
					read = message["read"]
				)
			except WasiError as e:
				return { "kind": "err", "errno": e.errno }
			
			handle = self._streams.insert(
				# anonymous class/object with read, write and close methods
				cast(
					BinaryIO,
					SimpleNamespace(
						read = functools.partial(self._filesystem.read, file_handle),
						write = functools.partial(self._filesystem.write, file_handle),
						close = functools.partial(self._filesystem.close, file_handle)
					)
				)
			)
			return { "kind": "ok", "stream": handle }
		elif message["kind"] == "http-call":
			try:
				request = self._network.fetch(
					message["url"],
					message["method"],
					message["headers"],
					None if message["body"] is None else bytes(message["body"])
				)
			except HostError as err:
				return { "kind": "err", "error_code": err.code, "message": err.message }

			handle = self._requests.insert(request)
			return { "kind": "ok", "handle": handle }
		elif message["kind"] == "http-call-head":
			request = self._requests.remove(message["handle"])
			if request is None:
				return { "kind": "err", "error_code": ErrorCode.NetworkError, "message": "Invalid http call handle" }

			try:
				response = request.resolve()
			except HostError as err:
				return { "kind": "err", "error_code": err.code, "message": err.message }

			return {
				"kind": "ok",
				"status": response.status(),
				"headers": response.headers(),
				"body_stream": self._streams.insert(response.body())
			}
		else:
			return { "kind": "err", "error": f"Unknown message {message['kind']}" }
	
	def stream_read(self, handle: int, count: int) -> bytes:
		stream = self._streams.get(handle)
		if stream is None:
			raise WasiError(WasiErrno.EBADF)
		
		return stream.read(count)

	def stream_write(self, handle: int, data: bytes) -> int:
		stream = self._streams.get(handle)
		if stream is None:
			raise WasiError(WasiErrno.EBADF)
		
		return stream.write(data)
	
	def stream_close(self, handle: int):
		stream = self._streams.remove(handle)
		if stream is None:
			raise WasiError(WasiErrno.EBADF)
		
		stream.close()
	
	def load_core(self, wasm: bytes):
		self._module = Module(self._engine, wasm)

	def init(self):
		if self._module is None:
			raise UnexpectedError("CoreNotLoaded", "Call load_core first")

		if self._core is not None:
			return

		instance = self._linker.instantiate(self._store, self._module)
		exports = instance.exports(self._store)

		self._core = WasiApp._AppCore(
			instance,
			self._wrap_export(exports["oneclient_core_setup"]),
			self._wrap_export(exports["oneclient_core_teardown"]),
			self._wrap_export(exports["oneclient_core_perform"]),
			self._wrap_export(exports["oneclient_core_get_metrics"]),
			self._wrap_export(exports["oneclient_core_clear_metrics"]),
			self._wrap_export(exports["oneclient_core_get_developer_dump"])
		)

		self._core.setup_fn()
	
	def destroy(self):
		if self._core is not None:
			self.send_metrics()
			self._core.teardown_fn()
			self._core = None
	
	def perform(
		self,
		profile_url: str,
		provider_url: str,
		map_url: str,
		usecase: str,
		input: Any,
		parameters: Mapping[str, str],
		security: SecurityValuesMap
	) -> Any:
		if self._core is None:
			raise UninitializedError()

		self._perform_state = WasiApp._PerformState(
			profile_url = profile_url,
			provider_url = provider_url,
			map_url = map_url,
			usecase = usecase,
			input = input,
			parameters = parameters,
			security = security
		)

		self._core.perform_fn()
		
		state = self._perform_state
		self._perform_state = None

		if state.exception is not None:
			raise state.exception

		if state.error is not None:
			raise state.error

		return state.result

	def _wrap_export(self, fn: Any) -> Any:
		def wrapper(*args):
			try:
				return fn(self._store, *args)
			except Exception as e:
				err_name = "UnexpectedError"
				if isinstance(e, wasmtime.Trap):
					err_name = "WebAssemblyRuntimeError"

				if self._core is not None:
					core = self._core
					self._core = None

					try:
						self._create_developer_dump(core)
						self._send_metrics_on_panic(core)
					except Exception as dump_e:
						raise UnexpectedError(err_name, f"Error during dumping") from dump_e
				
				raise UnexpectedError(err_name, "Error while executing WebAssembly") from e
		
		return wrapper
	
	def _get_tracing_events_by_arena(self, core: "WasiApp._AppCore", arena_ptr: Ptr) -> List[str]:
		memory = self._memory_from_core(core)
		buffer1_ptr = memory.read_i32(arena_ptr)
		buffer1_size = memory.read_i32(arena_ptr + 4)
		buffer2_ptr = memory.read_i32(arena_ptr + 8)
		buffer2_size = memory.read_i32(arena_ptr + 12)

		buffer = memory.read_bytes(buffer1_ptr, buffer1_size) + memory.read_bytes(buffer2_ptr, buffer2_size)
		events = []

		start = 0
		while True:
			null_index = buffer.find(0, start)
			if null_index == -1:
				break

			events.append(buffer[start : null_index].decode("utf-8"))
			start = null_index + 1
		
		return events

	def send_metrics(self):
		if self._core is None:
			return
		
		arena_pointer = self._core.get_metrics_fn()
		events = self._get_tracing_events_by_arena(self._core, arena_pointer)
		self._core.clear_metrics_fn()
		
		if len(events) > 0:
			self._persistence.persist_metrics(events)

	def _send_metrics_on_panic(self, core: "WasiApp._AppCore"):
		arena_pointer = core.get_metrics_fn()
		events = self._get_tracing_events_by_arena(core, arena_pointer)
		
		if len(events) > 0:
			self._persistence.persist_metrics(events)

	def _create_developer_dump(self, core: "WasiApp._AppCore"):
		arena_pointer = core.get_devleoper_dump_fn()
		events = self._get_tracing_events_by_arena(core, arena_pointer)
		
		if len(events) > 0:
			self._persistence.persist_developer_dump(events)

	def user_agent():
		sys_platform = platform.system()
		sys_arch = platform.architecture()[0]
		python_version = sys.version.split()[0]

		return f"one-sdk-python/{metadata.version('one-sdk')} ({sys_platform} {sys_arch}) python/{python_version}"
