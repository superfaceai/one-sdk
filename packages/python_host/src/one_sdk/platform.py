from typing import BinaryIO, List, Mapping, Optional, cast

from datetime import datetime
from collections import defaultdict

import urllib3
from urllib3.exceptions import MaxRetryError, NewConnectionError

from one_sdk.handle_map import HandleMap
from one_sdk.error import ErrorCode, HostError, WasiErrno, WasiError

# TODO: maybe fetch should operate over handles as well and not return an object like this?
# or filesystem should return BinaryIO
#
# this also applies to node host

class PythonFilesystem:
	def __init__(self):
		self._files: HandleMap[BinaryIO] = HandleMap()

	def open(
		self,
		path: str,
		create_new: bool = False,
		create: bool = False,
		truncate: bool = False,
		append: bool = False,
		write: bool = False,
		read: bool = False
	) -> int:
		mode = "b"
		if create_new == True:
			mode += "x"
		elif create == True:
			pass # no idea?

		if truncate == True:
			mode += "w"
		elif append == True:
			mode += "a"
		elif write == True:
			mode += "+"
		elif read == True:
			mode += "r"
		
		try:
			# we always open the file in binary mode
			file = cast(BinaryIO, open(path, mode))
		except FileNotFoundError as e:
			raise WasiError(WasiErrno.ENOENT) from e
		except Exception as e:
			# TODO: figure out what exceptions this can throw and map them to Wasi errnos
			raise WasiError(WasiErrno.EINVAL) from e

		return self._files.insert(file)
	
	def read(self, handle: int, count = -1) -> bytes:
		file = self._files.get(handle)
		if file is None:
			raise WasiError(WasiErrno.EBADF)

		try:
			return file.read(count)
		except ValueError as e:
			# ValueError means the stream was closed, for which posix usually returns BADF
			raise WasiError(WasiErrno.EBADF) from e
		except Exception as e:
			# TODO: map system exception to wasi
			raise WasiError(WasiErrno.EINVAL) from e
	
	def write(self, handle: int, data: bytes) -> int:
		file = self._files.get(handle)
		if file is None:
			raise WasiError(WasiErrno.EBADF)
		
		try:
			return file.write(data)
		except ValueError as e:
			# ValueError means the stream was closed, for which posix usually returns BADF
			raise WasiError(WasiErrno.EBADF)
		except Exception as e:
			# TODO: map system exception to wasi
			raise WasiError(WasiErrno.EINVAL) from e

	
	def close(self, handle: int):
		file = self._files.get(handle)
		if file is None:
			raise WasiError(WasiErrno.EBADF)

		try:
			file.close()
		except Exception as e:
			# TODO: map system exception to wasi
			raise WasiError(WasiErrno.EINVAL) from e

class HttpResponse(BinaryIO):
	def __init__(self, response):
		self._response = response

	def status(self) -> int:
		return self._response.status
	
	# TODO: will be list[tuple[str, str]]
	def headers(self) -> Mapping[str, List[str]]:
		headers = defaultdict(list)
		for (key, value) in self._response.headers.items():
			headers[key].append(value)

		return headers
	
	def body(self) -> BinaryIO:
		return self

	# take a shortcut and implement BinaryIO directly on this class
	def read(self, count: Optional[int] = None) -> bytes:		
		return self._response.read(count)
	
	def close(self):
		# TODO: if we don't need anything else here we can just return `self._response` in `self.body()`
		self._response.close()
class DeferredHttpResponse:
	def __init__(self, response, exception = None):
		self._response = response
		self._exception = exception
	
	def resolve(self) -> HttpResponse:
		if self._exception is not None:
			raise self._exception
		
		return HttpResponse(self._response)

class PythonNetwork:
	def __init__(self):
		self._manager = urllib3.PoolManager(num_pools = 3)
		self._retries = urllib3.Retry(connect = 2, read = 2, redirect = 3)

	def fetch(
		self,
		url: str,
		method: str,
		headers: Mapping[str, List[str]],
		body: Optional[bytes]
	) -> DeferredHttpResponse:
		# TODO: catch InvalidUrl
		headers_dict = urllib3.HTTPHeaderDict()
		for (key, values) in headers.items():
			for value in values:
				headers_dict.add(key, value)
		
		response = None
		exception = None
		try:
			response = self._manager.urlopen(
				method,
				url,
				True,
				body = body,
				headers = headers_dict,
				retries = None,
				preload_content = False,
				decode_content = True,
				release_conn = False,
				assert_same_host = False
			)
		except MaxRetryError as err:
			if isinstance(err.reason, NewConnectionError):
				reason_str = str(err.reason) # yes, this is insane, the original exception just gets lost
				if "[Errno 61] Connection refused" in reason_str:
					exception = HostError(ErrorCode.NetworkConnectionRefused, "[Errno 61] Connection refused")
				elif "[Errno 8] nodename nor servname provided, or not known" in reason_str:
					exception = HostError(ErrorCode.NetworkHostNotFound, "[Errno 8] nodename nor servname provided, or not known")
				else:
					exception = HostError(ErrorCode.NetworkError, f"{err}")				
			else:
				exception = HostError(ErrorCode.NetworkError, f"{err}")
		
		return DeferredHttpResponse(response, exception)

class PythonPersistence:
	def __init__(self, token: Optional[str] = None, superface_api_url: Optional[str] = None, user_agent: Optional[str] = None):
		self._token = token
		self._user_agent = user_agent
		if superface_api_url is not None:
			self._insights_url = f"{superface_api_url}/insights/sdk_event"
		else:
			self._insights_url = "https://superface.ai/insights/sdk_event"
		
		self._network = PythonNetwork()

	def persist_metrics(self, events: List[str]):
		headers = {
			"content-type": ["application/json"]
		}
		if self._token is not None:
			headers["authorization"] = [f"SUPERFACE-SDK-TOKEN {self._token}"]
		if self._user_agent is not None:
			headers["user-agent"] = [self._user_agent]
		
		response = self._network.fetch(
			f"{self._insights_url}/batch",
			"POST",
			headers,
			("[" + ",".join(events) + "]").encode("utf-8")
		).resolve()
		response.close()
	
	def persist_developer_dump(self, events: List[str]):
		timestamp = datetime.now().isoformat().replace(":", "-").replace(".", "-")
		file_name = f"onesdk_devlog_dump_{timestamp}.txt"

		with open(file_name, "w") as file:
			file.write("".join(events))
