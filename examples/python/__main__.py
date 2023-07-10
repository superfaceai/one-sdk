import os
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from one_sdk import OneClient


class MyServer(BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)
    self.send_header("Content-type", "application/json")
    self.end_headers()

    self.wfile.write(bytes(json.dumps(
        {
            "url": self.path,
            "method": self.command,
            "headers": dict(self.headers)
        }
    ), "utf8"))


webServer = HTTPServer(("127.0.0.1", 8000), MyServer)
threading.Thread(target = webServer.serve_forever).start()

client = OneClient(
    assets_path = "../examples/comlinks/src",
    superface_api_url = "https://superface.dev",
    token = os.getenv("ONESDK_TOKEN")
)

profile = client.get_profile("wasm-sdk/example")
use_case = profile.get_usecase("Example")
try:
    r = use_case.perform(
        { "id": 1 },
        provider = "localhost",
        parameters = { "PARAM": "parameter_value" },
        security = { "basic_auth": { "username": "username", "password": "password" } }
    )
    print(f"RESULT: {r}")
except Exception as e:
    print(f"ERROR: {e}")
    raise
finally:
    client.send_metrics_to_superface()
    webServer.shutdown()
