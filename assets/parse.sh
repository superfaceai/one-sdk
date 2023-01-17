#!/bin/sh

# brew install wasm-tools

base=$(dirname "$0")

wasm-tools parse "${base}/wat/${1}.wat" -o "${base}/wasm/${1}.wasm"
