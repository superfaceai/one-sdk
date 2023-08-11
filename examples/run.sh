#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

MAKE_FLAGS=${2:-MODE=debug}

case $1 in
	node)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd "$base/.."
			make build_host_javascript $MAKE_FLAGS
		fi
		cd "$base"
		node --no-warnings --experimental-wasi-unstable-preview1 ./node_js/index.mjs
	;;

	cloudflare)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd "$base/.."
			make build_host_javascript $MAKE_FLAGS
		fi
		cd "$base/cloudflare_worker"
		yarn install
		yarn dev
	;;

	python)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd "$base/.."
			make build_host_python $MAKE_FLAGS
		fi
		cd "$base"
		source ../host/python/venv/bin/activate
		python3 ./python
	;;

	*)
		echo "usage: run.sh node|cloudflare|python"
		exit 1
	;;
esac
