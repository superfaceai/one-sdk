#!/bin/sh

set -e

base=$(dirname "$0")
cd "$base"

cargo build --package superface_core --release --target wasm32-wasi

rm -rf dist && mkdir dist
cp 'target/wasm32-wasi/release/superface_core.wasm' 'dist/core.wasm'
echo 'Optimizing wasm...'
wasm-opt -O2 'dist/core.wasm' --output 'dist/core.wasm'
wasm-opt -O2 --asyncify --pass-arg asyncify-imports@sf_host_unstable.message_exchange,sf_host_unstable.stream_read,sf_host_unstable.stream_write \
	'dist/core.wasm' --output 'dist/core-async.wasm'
