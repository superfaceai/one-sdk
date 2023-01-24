#!/bin/sh

./integration/build.sh wat wat_example
./integration/build.sh asc asc_example
./core/build.sh
python3 host/python/__main__.py core/core.wasm integration/wasm/asc_example.wasm 1