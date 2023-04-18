#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

CORE="$base/../core/dist/core.wasm"
CORE_ASYNC="$base/../core/dist/core-async.wasm"
ASSETS_PATH="$base/../examples"
USECASE=Example
INPUT='{"id":1}'
VARS='{"MY_VAR":"variable_value"}'
SECRETS='{"SECRET_NAME":"supersecret","USER":"superuser","PASSWORD":"superpassword"}'

case $1 in
	js)
		cd js
		yarn build
		cd ..
		node --experimental-wasi-unstable-preview1 ./test.js "$ASSETS_PATH" $USECASE $INPUT $VARS $SECRETS
	;;

	python|py)
		# FIXME
		python3 ./python "$CORE" "$MAP" $USECASE
	;;

	*)
		echo "usage: test.sh js|py"
		exit 1
	;;
esac
