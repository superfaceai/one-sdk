import os
import json
import threading
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

from one_sdk import OneClient, PerformError, UnexpectedError, ValidationError

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

web_server = HTTPServer(("127.0.0.1", 8000), MyServer)
threading.Thread(target = web_server.serve_forever).start()

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
        security = { "basic_auth": { "username": "username", "password": "password" }, "authic_base": { "apikey": "api_key_value" } }
    )
    print(f"RESULT: {r}")
except PerformError as e:
    print(f"ERROR RESULT: {e.error_result}")
except ValidationError as e:
    print(f"INVALID INPUT: {e.message}", file = sys.stderr)
except UnexpectedError as e:
    print(f"ERROR:", e, file = sys.stderr)
finally:
    client.send_metrics_to_superface()
    web_server.shutdown()
