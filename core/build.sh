#!/bin/sh

set -e

base=$(dirname "$0")
cd "$base"

# cargo wasi test -- --nocapture
cargo build --package superface_core --target wasm32-wasi

rm -rf dist && mkdir dist
cp 'target/wasm32-wasi/debug/superface_core.wasm' 'dist/core.wasm'

echo 'Running asyncify...'
wasm-opt -O2 --asyncify --pass-arg=asyncify-asserts \
	'dist/core.wasm' --output 'dist/core-async.wasm'

echo 'Optimizing wasm...'
wasm-opt -O2 'dist/core.wasm' --output 'dist/core.wasm'
