#!/usr/bin/env python3

import os
import sys
import json
import os.path
import gzip

from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from app import App, HttpManager
from sf_host import log

def _load_json(path):
	with open(path, "r") as f:
		return json.load(f)

class RecordedResponseHeaders:
	def __init__(self, headers):
		self.raw = headers
	
	# we need the items method, but we don't want to coalesce headers
	def items(self):
		for i in range(0, len(self.raw), 2):
			key = self.raw[i].lower()
			value = self.raw[i + 1]
			yield (key, value)
class RecordedResponse:
	def __init__(self, recording):
		self.recording = recording

		response_encoding = []
		response_type = "application/json"
		for key, value in self.headers.items():
			if key == "content-encoding":
				response_encoding.append(value)
			elif key == "content-type":
				response_type = value
		
		response = recording["response"]
		if len(response_encoding) > 0:
			# in this case the response is a list of hex-encoded chunks
			response = bytearray.fromhex(''.join(response))

			for encoding in response_encoding:
				if encoding == "gzip":
					response = gzip.decompress(response)
				else:
					raise RuntimeError(f"content-encoding {encoding} not supported")
			
			self.response_data = response
		elif recording["responseIsBinary"]:
			# response is just one long hex-encoded string
			self.response_data = bytearray.fromhex(response)
		else:
			# in this case response is already decoded, so we need to encode it again...
			if response_type.startswith("text/"):
				self.response_data = response.encode("utf-8")
			elif response_type.startswith("application/") and "json" in response_type.split("/")[1]:
				self.response_data = json.dumps(response).encode("utf-8")
			else:
				raise RuntimeError(f"content-type {response_type} not supported")
		self.response_cursor = 0
	
	@property
	def status_code(self):
		return self.recording["status"]
	
	@property
	def headers(self):
		return RecordedResponseHeaders(self.recording["rawHeaders"])

	def read(self, out_len):
		count = min(len(self.response_data) - self.response_cursor, out_len)
		if count > 0:
			data = self.response_data[self.response_cursor:self.response_cursor + count]
			self.response_cursor += count
		else:
			data = b''
		
		return data
		
class TestHttpManager(HttpManager):
	def __init__(self, streams, recordings):
		super().__init__(streams)
		self.recordings = recordings
	
	def http_call(self, msg):
		handle = self.next_id
		self.next_id += 1

		recording = self._find_recording(msg)
		if recording is None:
			return { "kind": "err", "error": "Could not find a recording for this request" }
		
		response = RecordedResponse(recording)
		self.requests[handle] = {
			"response": response,
			"response_stream_handle": self.streams.register(
				response,
				lambda: self._cleanup_http(handle)
			)
		}

		return { "kind": "ok", "handle": handle }
	
	def _find_recording(self, msg):
		method = msg["method"]
		url = msg["url"]

		for recording in self.recordings:
			rec_url = recording["scope"].rsplit(":", 1)[0] + recording["path"]
			if recording["method"].upper() == method.upper() and url == rec_url:
				return recording
		
		log(f"host: Considered recordings for {method.upper()} {url}:")
		for recording in self.recordings:
			log("host:", recording["method"].upper() + " " + recording["scope"].rsplit(":", 1)[0] + recording["path"])
		
		return None

@dataclass
class TestEntry:
	"""Entry with all data needed to run core"""
	# path to transpiled map, prefixed with `file://`
	map_name: str
	usecase: str
	input: Any
	parameters: Any
	security: Any
	recordings: list
def prepare_test_entry(
	superjson_path, integrations_root,
	profile, provider, usecase,
	recording_type_prefix, recording_hash,
	map_input
):
	def _path(*args):
		return os.path.abspath(
			os.path.join(*args)
		)
	
	superjson = _load_json(superjson_path)
	base_path = os.path.dirname(superjson_path)
	
	profile_path = _path(base_path, superjson["profiles"][profile]["file"])
	suma_map_path = _path(base_path, superjson["profiles"][profile]["providers"][provider]["file"])
	provider_path = _path(base_path, superjson["providers"][provider]["file"])
	
	maps_base_path = os.path.dirname(suma_map_path)
	recordings_path = _path(maps_base_path, f"recordings/{provider}.recording.json")

	map_name = profile.replace("/", "_")
	map_name = _path(integrations_root, f"{map_name}.{provider}.suma.js")
	map_name = f"file://{map_name}"

	provider_json = _load_json(provider_path)
	parameters = {
		"__provider": {
			"services": dict((s["id"], { "baseUrl": s["baseUrl"] }) for s in provider_json["services"]),
			"defaultService": provider_json["defaultService"]
		}
	}
	for parameter in provider_json.get("parameters", {}):
		key = parameter["name"]
		value = superjson["providers"][provider].get("parameters", {}).get(key, None)
		if value is None:
			value = parameter.get("default", None)
		parameters[key] = value

	security = None # TODO

	recordings_json = _load_json(recordings_path)

	recordings = []
	recordings_key = f"{profile}/{provider}/{usecase}"
	if recording_type_prefix != "":
		recordings_key = f"{recording_type_prefix}-{recordings_key}"
	try:
		recordings = recordings_json[recordings_key][recording_hash]
	except KeyError:
		available = []
		for key in recordings_json:
			for hsh in recordings_json[key]:
				available.append(f"{key}.{hsh}")
		log(f"host: Could not find recording for {recordings_key}.{recording_hash}, available {available} at {recordings_path}")

	return TestEntry(
		map_name,
		usecase,
		map_input,
		parameters,
		security,
		recordings
	)

if __name__ == "__main__":
	core_root = os.environ["SF_CORE_ROOT"]
	core_blob_path = os.path.join(core_root, "core/core.wasm")
	integrations_root = os.path.join(core_root, "integration/js")

	# todo: send this as json
	recording_type_prefix, profile, provider, usecase, recording_hash = sys.argv[1].split(".")
	map_input = json.load(sys.stdin)

	entry = prepare_test_entry("superface/super.json", integrations_root, profile, provider, usecase, recording_type_prefix, recording_hash, map_input)
	
	app = App(stdout = None, http_manager = lambda s: TestHttpManager(s, entry.recordings))
	app.link_sf_host()
	app.load_wasi_module(core_blob_path)

	result = None
	with app as app:
		result = app.perform(entry.map_name, entry.usecase, entry.input, entry.parameters, entry.security)
	
	json.dump(result, sys.stdout)
