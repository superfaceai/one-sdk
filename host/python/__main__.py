import sys

from app import App
from sf_host import log

CORE_WASM = sys.argv[1]
PROFILE_URL = sys.argv[2]
MAP_URL = sys.argv[3]
USECASE = sys.argv[4]
APP = App()
APP.load_wasi_module(CORE_WASM)

if "swapi" in MAP_URL and USECASE == "RetrieveCharacterInformation":
	PARAMETERS = {
		"__provider": {
			"services": {
				"default": {
					"baseUrl": "https://swapi.dev/api"
				}
			},
			"defaultService": "default"
		}
	}
	with APP as app:
		log("host: ==================================================")
		log("host: result:", app.perform(PROFILE_URL, MAP_URL, USECASE, { "characterName": "Yoda" }, PARAMETERS, { "baz": 1 }))
		log("host: ==================================================")
		debug_stream = app.streams.register(SimpleNamespace(close = lambda: None))
		log("host: result2:", app.perform(PROFILE_URL, MAP_URL, USECASE, { "characterName": "Luke Skywalker", "debug_stream": { "$HostValue::Stream": debug_stream } }, PARAMETERS))
		log("host: ==================================================")

		log("host: waiting 5 seconds to trigger recache...")
		time.sleep(5)
		log("host: result3:", app.perform(PROFILE_URL, MAP_URL, MAP_USECASE, { "characterName": "Skywalker" }, PARAMETERS))
		log("host: ==================================================")
elif "overpass-de" in MAP_URL and USECASE == "NearbyPoi":
	PARAMETERS = {
		"__provider": {
			"services": {
				"default": {
					"baseUrl": "https://overpass-api.de"
				}
			},
			"defaultService": "default"
		}
	}
	INPUT = {
		"center": {
			"latitude": 51.477,
			"longitude": 0.0,
		},
		"radius": 100,
		"categories": ["CAFE"]
	}
	with APP as app:
		log("host: result:", app.perform(PROFILE_URL, MAP_URL, USECASE, INPUT, PARAMETERS))
elif "github" in MAP_URL and USECASE == "UserRepos":
	PARAMETERS = {
		"__provider": {
			"services": {
				"default": {
					"baseUrl": "https://api.github.com"
				}
			},
			"defaultService": "default"
		}
	}
	INPUT = {
		"user": "oclif"
	}
	with APP as app:
		log("host: result:", app.perform(PROFILE_URL, MAP_URL, USECASE, INPUT, PARAMETERS))
else:
	raise RuntimeError("Unknown map/usecase, add input here")
