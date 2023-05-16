#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

ASSETS_PATH="$base/../examples/Basic"
PROFILE="wasm-sdk/example"
USECASE=Example
INPUT='{"id":1}'
PROVIDER=localhost
PARAMETERS='{"PARAM":"parameter_value"}'
SECURITY='{"basic_auth":{"username":"username","password":"password"}}'

MAKE_FLAGS=${2:-CORE_PROFILE=debug}

case $1 in
	node)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd ..
			make build_host_js $MAKE_FLAGS
		fi
		cd "$base"
		node --experimental-wasi-unstable-preview1 ./node_example.mjs $ASSETS_PATH $PROFILE $USECASE $INPUT $PROVIDER $PARAMETERS $SECURITY
	;;

	cloudflare)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd ..
			make build_host_js $MAKE_FLAGS
		fi
		cd "$base/cloudflare_worker"
		yarn dev
	;;

	python)
		echo "TODO: Python host is currenly not up to date with the rest of the codebase"
		# FIXME
		python3 ./python "$CORE" "$MAP" $USECASE
	;;

	*)
		echo "usage: run.sh node|cloudflare|python"
		exit 1
	;;
esac
