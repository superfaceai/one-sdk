from threading import Thread
from http.server import HTTPServer, BaseHTTPRequestHandler
from http import HTTPStatus
import json

class EchoHttpServerHandler(BaseHTTPRequestHandler):
	# adapted from https://github.com/python/cpython/blob/3.11/Lib/http/server.py#L395
	def handle_one_request(self):
		try:
			self.raw_requestline = self.rfile.readline(65537)
			if len(self.raw_requestline) > 65536:
				self.requestline = ''
				self.request_version = ''
				self.command = ''
				self.send_error(HTTPStatus.REQUEST_URI_TOO_LONG)
				return
			if not self.raw_requestline:
				self.close_connection = True
				return
			if not self.parse_request():
				# An error code has been sent, just exit
				return
			self.do_any()
			self.wfile.flush() #actually send the response if not already done.
		except TimeoutError as e:
			#a read or a write timed out.  Discard this connection
			self.log_error("Request timed out: %r", e)
			self.close_connection = True
			return
	
	def do_any(self):
		if self.headers.get("x-custom-header", "") == "test-no-body":
			self.send_response(HTTPStatus.NO_CONTENT)
			self.end_headers()
			return

		body = json.dumps({
			"url": self.path,
			"method": self.command,
			"headers": self.headers.items()
		}).encode("utf-8")
		
		self.send_response(HTTPStatus.OK)
		self.send_header("Content-type", "application/json")
		self.end_headers()
		self.wfile.write(body)

class EchoHttpServer:
	def __init__(self, port = 8000):
		self._thread = None
		self._server = HTTPServer(("", port), EchoHttpServerHandler)
	
	def run_threaded(self):
		self._thread = Thread(target = self._run)
		self._thread.start()
	
	def _run(self):
		with self._server as httpd:
			httpd.serve_forever()

	def shutdown(self):
		self._server.shutdown()
