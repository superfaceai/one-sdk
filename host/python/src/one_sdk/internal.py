from typing import IO, Any, Callable, Mapping, Optional, TypeAlias, cast

import os
import os.path
import struct
from dataclasses import dataclass

from wasmtime import Engine, Instance, Memory, Store, Module, Linker, WasiConfig
import wasmtime

from one_sdk.handle_map import HandleMap
from one_sdk.sf_host import Ptr, Size, link as sf_host_link
from one_sdk.error import HostError, ErrorCode, PerformError, UnexpectedError, UninitializedError, WasiErrno
from one_sdk.http import HttpRequest

SecurityValuesMap: TypeAlias = Mapping[str, Mapping[str, str]]

CORE_PATH = os.path.abspath(os.path.join(__file__, "../../../assets/core.wasm"))
if "CORE_PATH" in os.environ:
	CORE_PATH = os.environ["CORE_PATH"]

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

	def __init__(self):
		self._engine = Engine()
		self._linker = Linker(self._engine)
		self._store = Store(self._engine)

		# linked modules and state
		self._linker.define_wasi()
		sf_host_link(self._linker, self)

		wasi = WasiConfig()
		wasi.inherit_env()
		wasi.inherit_stdout()
		wasi.inherit_stderr()
		self._store.set_wasi(wasi)
		
		self.streams: HandleMap[IO[bytes]] = HandleMap()
		self._requests: HandleMap[HttpRequest] = HandleMap()

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

	@staticmethod
	def _handle_message_open_mode(m) -> str:
		mode = "b"

		if m["create_new"] == True:
			mode += "x"
		elif m["create"] == True:
			pass # no idea?

		if m["truncate"] == True:
			mode += "w"
		elif m["append"] == True:
			mode += "a"
		elif m["write"] == True:
			mode += "+"
		elif m["read"] == True:
			mode += "r"

		return mode

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
			self._perform_state.exception = UnexpectedError(message["exception"]["error_core"], message["exception"]["message"])
			return { "kind": "ok" }
		elif message["kind"] == "file-open":
			path = message["path"]
			open_mode = WasiApp._handle_message_open_mode(message)
			try:
				file = open(path, open_mode)
			except:
				return { "kind": "err", "errno": WasiErrno.EINVAL } # TODO: figure out what exceptions this can throw and map them to Wasi errnos
			
			handle = self.streams.insert(file)
			return { "kind": "ok", "stream": handle }
		elif message["kind"] == "http-call":
			try:
				request = HttpRequest(
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
				status, headers, body_stream = request.get_response()
			except HostError as err:
				return { "kind": "err", "error_code": err.code, "message": err.message }

			return {
				"kind": "ok",
				"status": status,
				"headers": headers,
				"body_stream": self.streams.insert(body_stream)
			}
		else:
			return { "kind": "err", "error": f"Unknown message {message['kind']}" }
	
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
				if self._core is not None:
					core = self._core
					self._core = None

					try:
						self._create_developer_dump(core)
						self._send_metrics_on_panic(core)
					except Exception as dump_e:
						raise UnexpectedError("UnexpectedError", f"Error during dumping") from dump_e
					
				error_name = "UnexpectedError"
				if isinstance(e, wasmtime.Trap):
					error_name = "WebAssemblyRuntimeError"
				
				raise UnexpectedError(error_name, "Error while executing WebAssembly") from e
		
		return wrapper
	
	def _get_tracing_events_by_arena(self, core: "WasiApp._AppCore", arena_ptr: Ptr) -> list[str]:
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
		
		print("send_metrics", len(events))

	def _send_metrics_on_panic(self, core: "WasiApp._AppCore"):
		arena_pointer = core.get_metrics_fn()
		events = self._get_tracing_events_by_arena(core, arena_pointer)
		
		print("_send_metrics_on_panic", len(events))

	def _create_developer_dump(self, core: "WasiApp._AppCore"):
		arena_pointer = core.get_devleoper_dump_fn()
		events = self._get_tracing_events_by_arena(core, arena_pointer)
		
		print("_create_developer_dump", len(events))

class InternalClient:
	def __init__(
		self,
		assets_path: str,
		token: Optional[str],
		superface_api_url: str
	):
		self._assets_path = assets_path
		self._token = token
		self._superface_api_url = superface_api_url
		self._ready = False
		self._app = WasiApp()
	
	def resolve_profile_url(self, profile: str) -> str:
		resolved_profile = profile.replace('/', '.')
		path = os.path.abspath(os.path.join(self._assets_path, f"{resolved_profile}.profile"))

		return f"file://{path}"

	def resolve_map_url(self, profile: str, provider: str) -> str:
		resolved_profile = profile.replace('/', '.')
		path = os.path.abspath(os.path.join(self._assets_path, f"{resolved_profile}.{provider}.map.js"))

		return f"file://{path}"
	
	def resolve_provider_url(self, provider: str) -> str:
		path = os.path.abspath(os.path.join(self._assets_path, f"{provider}.provider.json"))

		return f"file://{path}"
	
	def init(self):
		if self._ready:
			return
		
		with open(CORE_PATH, "rb") as file:
			self._app.load_core(file.read())
		self._app.init()
		self._ready = True
	
	def destroy(self):
		if not self._ready:
			return
		
		self._app.destroy()
		self._ready = False
	
	def perform(
		self,
		profile: str,
		provider: str,
		usecase: str,
		input: Any,
		parameters: Mapping[str, str] = {},
		security: Optional[SecurityValuesMap] = None
	) -> Any:
		if security is None:
			security = dict()

		self.init()

		profile_url = self.resolve_profile_url(profile)
		provider_url = self.resolve_provider_url(provider)
		map_url = self.resolve_map_url(profile, provider)
		
		try:
			return self._app.perform(
				profile_url = profile_url,
				provider_url = provider_url,
				map_url = map_url,
				usecase = usecase,
				input = input,
				parameters = parameters,
				security = security
			)
		except UnexpectedError as e:
			if e.name == "WebAssemblyRuntimeError":
				self.destroy()
				self.init()
			raise
