#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

CORE="$base/../core/dist/core.wasm"
CORE_ASYNC="$base/../core/dist/core-async.wasm"
ASSETS_PATH="$base/../examples/Basic"
USECASE=Example
INPUT='{"id":1}'
VARS='{"MY_VAR":"variable_value"}'
SECRETS='{"SECRET_NAME":"supersecret","USER":"superuser","PASSWORD":"superpassword"}'

case $1 in
	node)
		cd ..
		make build_host_node
		cd "$base"
		node --experimental-wasi-unstable-preview1 ./node_example.js "$ASSETS_PATH" $USECASE $INPUT $VARS $SECRETS
	;;

	python|py)
		# FIXME
		python3 ./python "$CORE" "$MAP" $USECASE
	;;

	*)
		echo "usage: run.sh node|py"
		exit 1
	;;
esac