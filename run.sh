#!/bin/sh

set -e

# ./integration/build.sh wat wat_example
# ./integration/build.sh asc asc_example
./core/build.sh
python3 host/python/__main__.py core/core.wasm js_example RetrieveCharacterInformation 1
