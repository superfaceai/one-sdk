#!/bin/sh

set -e

./core/build.sh
# ./integration/build.sh

# run in integration/comlink-transpile
# yarn run -s comtrans ./fixtures/overpass-de.suma >../js/overpass-de.suma.js

# python3 host/python/__main__.py core/core.wasm swapi RetrieveCharacterInformation
# python3 host/python/__main__.py core/core.wasm file://integration/js/swapi.js RetrieveCharacterInformation
# python3 host/python/__main__.py core/core.wasm file://integration/js/swapi.suma.js RetrieveCharacterInformation
python3 host/python/__main__.py core/core.wasm file://integration/js/overpass-de.suma.js NearbyPoi
# python3 host/python/__main__.py core/core.wasm file://integration/js/github.suma.js UserRepos


# node dist/main_superjson.js ~/Documents/Superface/station/superface/super.json ~/Documents/Superface/poc-webassembly/integration/js
# SF_CORE_ROOT=~/Documents/Superface/poc-webassembly yarn run test
