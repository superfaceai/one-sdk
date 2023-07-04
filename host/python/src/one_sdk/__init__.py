from typing import Any, Mapping, Optional, Self

from one_sdk.internal import InternalClient

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
	def _load_local(cls, internal: InternalClient, name: str) -> Self:
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
