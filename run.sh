#!/bin/sh

set -e

./core/build.sh
python3 host/python/__main__.py core/core.wasm swapi RetrieveCharacterInformation
