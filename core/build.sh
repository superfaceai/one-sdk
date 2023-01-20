#!/bin/sh

base=$(dirname "$0")

cd "$base"
cargo build --release --target wasm32-wasi
cd -

cp "$base/target/wasm32-wasi/release/core.wasm" "$base/core.wasm"
