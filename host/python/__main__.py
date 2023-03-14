import sys

from app import App
from sf_host import log

CORE_WASM = sys.argv[1]
MAP_NAME = sys.argv[2]
MAP_USECASE = sys.argv[3]
APP = App()
APP.link_sf_host()
APP.load_wasi_module(CORE_WASM)

if "swapi" in MAP_NAME and MAP_USECASE == "RetrieveCharacterInformation":
	PARAMETERS = {
		"provider": {
			"services": {
				"default": {
					"baseUrl": "https://swapi.dev/api"
				}
			}
		}
	}
	with APP as app:
		log("host: ==================================================")
		log("host: result:", app.perform(MAP_NAME, MAP_USECASE, { "characterName": "Yoda" }, PARAMETERS, { "baz": 1 }))
		log("host: ==================================================")
		debug_stream = app.streams.register(SimpleNamespace(close = lambda: None))
		log("host: result2:", app.perform(MAP_NAME, MAP_USECASE, { "characterName": "Luke Skywalker", "debug_stream": { "$HostValue::Stream": debug_stream } }, PARAMETERS))
		log("host: ==================================================")

		log("host: waiting 5 seconds to trigger recache...")
		time.sleep(5)
		log("host: result3:", app.perform(MAP_NAME, MAP_USECASE, { "characterName": "Skywalker" }, PARAMETERS))
		log("host: ==================================================")
elif "overpass-de" in MAP_NAME and MAP_USECASE == "NearbyPoi":
	PARAMETERS = {
		"provider": {
			"services": {
				"default": {
					"baseUrl": "https://overpass-api.de"
				}
			}
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
		log("host: result:", app.perform(MAP_NAME, MAP_USECASE, INPUT, PARAMETERS))
elif "github" in MAP_NAME and MAP_USECASE == "UserRepos":
	PARAMETERS = {
		"provider": {
			"services": {
				"default": {
					"baseUrl": "https://api.github.com"
				}
			}
		}
	}
	INPUT = {
		"user": "oclif"
	}
	with APP as app:
		log("host: result:", app.perform(MAP_NAME, MAP_USECASE, INPUT, PARAMETERS))
else:
	raise RuntimeError("Unknown map/usecase, add input here")
