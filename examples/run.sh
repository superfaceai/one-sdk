#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

CORE="$base/../core/dist/core.wasm"
CORE_ASYNC="$base/../core/dist/core-async.wasm"
ASSETS_PATH="$base/../examples/Basic"
USECASE=Example
INPUT='{"id":1}'
PROVIDER=localhost
PARAMETERS='{"PARAM":"parameter_value"}'
SECURITY='{"basic_auth":{"user":"username","password":"password"}}'

mode=${2:-debug}

case $1 in
	node)
		cd ..
		make build_host_node mode=$mode
		cd "$base"
		node --experimental-wasi-unstable-preview1 ./node_example.js $ASSETS_PATH $PROFILE $USECASE $INPUT $PROVIDER $PARAMETERS $SECURITY
	;;

	cloudflare)
		cd ..
		make build_host_cloudflare mode=$mode
		cd "$base/cloudflare_worker"
		yarn install
		yarn dev
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
