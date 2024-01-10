#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

MAKE_FLAGS=${1}

cd "$base/../.."
make build_nodejs_host CARGO_PROFILE=release $MAKE_FLAGS
cd "$base"
node --no-warnings --experimental-wasi-unstable-preview1 ./client.mjs 40000 >data/node_data_40k.csv
node --no-warnings --experimental-wasi-unstable-preview1 ./client.mjs 10000 >data/node_data_10k.csv

cd "$base/../.."
make build_python_host CARGO_PROFILE=release $MAKE_FLAGS
cd "$base"
source ../../packages/python_host/venv/bin/activate
python3 -m pip install psutil
python3 client.py 40000 >data/python_data_40k.csv
python3 client.py 10000 >data/python_data_10k.csv
