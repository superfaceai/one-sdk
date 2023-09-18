#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

MAKE_FLAGS=${2:-MODE=debug}

case $1 in
	node)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd "$base/.."
			make build_nodejs_host $MAKE_FLAGS
		fi
		cd "$base"
		node --no-warnings --experimental-wasi-unstable-preview1 ./nodejs/index.mjs
	;;

	cloudflare)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd "$base/.."
			make build_cfw_host $MAKE_FLAGS
		fi
		cd "$base/cloudflare_worker"
		yarn install
		yarn dev
	;;

	python)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd "$base/.."
			make build_python_host $MAKE_FLAGS
		fi
		cd "$base"
		source ../packages/python_host/venv/bin/activate
		python3 ./python
	;;

	*)
		echo "usage: run.sh node|cloudflare|python"
		exit 1
	;;
esac
