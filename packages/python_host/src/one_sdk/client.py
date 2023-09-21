from typing import Any, Mapping, Optional

import os
import os.path

from one_sdk.app import WasiApp, SecurityValuesMap
from one_sdk.error import UnexpectedError
from one_sdk.platform import PythonFilesystem, PythonNetwork, PythonPersistence

CORE_PATH = os.path.abspath(os.path.join(__file__, "../assets/core.wasm"))
if "CORE_PATH" in os.environ:
	CORE_PATH = os.environ["CORE_PATH"]

class InternalClient:
	def __init__(
		self,
		assets_path: str,
		token: Optional[str],
		superface_api_url: str
	):
		self._assets_path = assets_path
		self._core_path = CORE_PATH
		self._ready = False
		self._app = WasiApp(
			PythonFilesystem(),
			PythonNetwork(),
			PythonPersistence(token, superface_api_url, WasiApp.user_agent())
		)

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
	
	def init(self, core_path = None):
		if self._ready:
			return
		
		with open(self._core_path, "rb") as file:
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
	
	def send_metrics(self):
		self._app.send_metrics()

class UseCase:
	def __init__(self, internal: InternalClient, profile: "Profile", name: str):
		self._internal = internal
		self._profile = profile
		self.name = name

	def perform(
		self,
		input: Any,
		provider: str,
		parameters: Mapping[str, str] = {},
		security: Optional[Mapping[str, Mapping[str, str]]] = None
	) -> Any:
		return self._internal.perform(
			profile = self._profile.name,
			provider = provider,
			usecase = self.name,
			input = input,
			parameters = parameters,
			security = security
		)

class Profile:
	def __init__(self, internal: InternalClient, name: str, url: str):
		self._internal = internal
		self.name = name
		self.url = url

	@classmethod
	def _load_local(cls, internal: InternalClient, name: str) -> "Profile": # TODO: Self return type - needs 3.11
		profile_url = internal.resolve_profile_url(name)
		return cls(internal, name, profile_url)

	
	def get_usecase(self, name: str) -> UseCase:
		return UseCase(self._internal, self, name)

class OneClient:
	def __init__(
		self,
		assets_path: str = "superface",
		token: Optional[str] = None,
		superface_api_url: str = "https://superface.ai"
	):
		self._internal = InternalClient(
			assets_path = assets_path,
			token = token,
			superface_api_url = superface_api_url
		)
	
	def init(self):
		self._internal.init()
	
	def destroy(self):
		self._internal.destroy()
	
	def get_profile(self, name: str) -> Profile:
		return Profile._load_local(self._internal, name)
	
	def send_metrics_to_superface(self):
		self._internal.send_metrics()
