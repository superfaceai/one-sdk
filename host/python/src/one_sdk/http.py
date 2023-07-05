from collections import defaultdict

from typing import BinaryIO, Mapping, Optional, Self, Tuple
import urllib.parse
import http.client

from one_sdk.error import ErrorCode, HostError, UnexpectedError

class HttpRequest(BinaryIO):
	def __init__(
		self,
		url: str,
		method: str,
		headers: Mapping[str, list[str]],
		body: Optional[bytes]
	):
		self._response = None
		self._deferred_exception = None

		parsed_url = urllib.parse.urlparse(url) # TODO: catch InvalidUrl
		connection_class = http.client.HTTPSConnection
		if parsed_url.scheme == "http":
			connection_class = http.client.HTTPConnection
		self._connection = connection_class(parsed_url.netloc)

		self._connection.putrequest(method, url)
		for (key, values) in headers.items():
			self._connection.putheader(key, *values)
		
		try:
			self._connection.endheaders(body)
		except ConnectionRefusedError as err:
			self._deferred_exception = HostError(ErrorCode.NetworkConnectionRefused, err.strerror)
	
	def get_response(self) -> Tuple[int, Mapping[str, list[str]], BinaryIO]:
		if self._deferred_exception is not None:
			raise self._deferred_exception

		if self._response is None:
			self._response = self._connection.getresponse()

		headers = defaultdict(list)
		for (key, value) in self._response.getheaders():
			headers[key.lower()].append(value)
		
		return (self._response.status, headers, self)

	# take a shortcut and implement BinaryIO directly on this class
	def read(self, count: Optional[int] = -1) -> bytes:
		if self._response is None:
			raise UnexpectedError("UnexpectedError", "Invalid HttpRequest state")
		
		return self._response.read(count)
	
	def close(self):
		if self._response is None:
			raise UnexpectedError("UnexpectedError", "Invalid HttpRequest state")

		self._response.close()
		self._connection.close()
