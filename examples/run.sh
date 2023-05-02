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

MAKE_FLAGS=${2:-mode=debug}

case $1 in
	node)
		cd ..
		make build_host_node $MAKE_FLAGS
		cd "$base"
		node --experimental-wasi-unstable-preview1 ./node_example.js $ASSETS_PATH $PROFILE $USECASE $INPUT $PROVIDER $PARAMETERS $SECURITY
	;;

	cloudflare)
		cd ..
		make build_host_cloudflare $MAKE_FLAGS
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
