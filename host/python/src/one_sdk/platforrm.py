from typing import BinaryIO, Mapping, Optional, cast

from collections import defaultdict
from datetime import datetime
import urllib.parse
import http.client

import urllib3

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
	def __init__(self, connection, response):
		self._connection = connection
		self._response = response

	def status(self) -> int:
		return self._response.status
	
	def headers(self) -> Mapping[str, list[str]]:
		headers = defaultdict(list)
		for (key, value) in self._response.getheaders():
			headers[key.lower()].append(value)
		
		return headers
	
	def body(self) -> BinaryIO:
		return self

	# take a shortcut and implement BinaryIO directly on this class
	def read(self, count: Optional[int] = -1) -> bytes:		
		return self._response.read(count)
	
	def close(self):
		self._response.close()
		self._connection.close()
class DeferredHttpResponse:
	def __init__(self, connection, exception = None):
		self._connection = connection
		self._exception = exception
	
	def resolve(self) -> HttpResponse:
		if self._exception is not None:
			raise self._exception
		
		return HttpResponse(self._connection, self._connection.getresponse())

class PythonNetwork:
	# def __init__(self):
	# 	self._manager = urllib3.PoolManager(num_pools = 3)
	# 	self._retries = urllib3.Retry(connect = 2, read = 2, redirect = 3)

	def fetch(
		self,
		url: str,
		method: str,
		headers: Mapping[str, list[str]],
		body: Optional[bytes]
	) -> DeferredHttpResponse:
		# pool = self._manager.connection_from_url(url)

		# response = pool.urlopen(
		# 	method,
		# 	url,
		# 	headers = None,
		# 	retries = self._retries,
		# 	redirect = True,
		# 	preload_content = False,
		# 	decode_content = True,
		# 	release_conn = False,
		# )

		parsed_url = urllib.parse.urlparse(url) # TODO: catch InvalidUrl
		connection_class = http.client.HTTPSConnection
		if parsed_url.scheme == "http":
			connection_class = http.client.HTTPConnection
		connection = connection_class(parsed_url.netloc)
		connection.set_debuglevel(1)

		connection.putrequest(method, url)
		for (key, values) in headers.items():
			connection.putheader(key, *values)
		
		header_names = frozenset(k.lower() for k in headers.keys())
		if body is not None and "content-length" not in header_names:
			connection.putheader("content-length", str(len(body)))
		
		exception = None
		try:
			connection.endheaders(body)
		except ConnectionRefusedError as err:
			exception = HostError(ErrorCode.NetworkConnectionRefused, err.strerror)
		
		return DeferredHttpResponse(connection, exception)

class PythonPersistence:
	def __init__(self, token: Optional[str] = None, superface_api_url: Optional[str] = None):
		self._token = token
		if superface_api_url is not None:
			self._insights_url = f"{superface_api_url}/insights/sdk_event"
		else:
			self._insights_url = "https://superface.ai/insights/sdk_event"
		
		self._network = PythonNetwork()

	def persist_metrics(self, events: list[str]):
		headers = {
			"content-type": ["application/json"]
		}
		if self._token is not None:
			headers["authorization"] = [f"SUPERFACE-SDK-TOKEN {self._token}"]
		
		response = self._network.fetch(
			f"{self._insights_url}/batch",
			"POST",
			headers,
			b"[abcd]"
		).resolve()
		response.close()
	
	def persist_developer_dump(self, events: list[str]):
		timestamp = datetime.now().isoformat().replace(":", "-").replace(".", "-")
		file_name = f"onesdk_devlog_dump_{timestamp}.txt"

		with open(file_name, "w") as file:
			file.write("".join(events))
