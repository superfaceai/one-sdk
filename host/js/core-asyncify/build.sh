#!/bin/sh

cargo build
cp target/wasm32-wasi/debug/core-asyncify.wasm core.wasm

wasm-opt -O2 --asyncify --pass-arg=asyncify-imports@sf_host_unstable.http_call core.wasm --output core-async.wasm
