#!/bin/sh

./integration/build.sh asc second
./core/build.sh
python3 host/python/__main__.py core/core.wasm integration/wasm/second.wasm 1