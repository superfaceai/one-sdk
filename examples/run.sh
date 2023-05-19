#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

MAKE_FLAGS=${2:-MODE=debug}

case $1 in
	node)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd ..
			make build_host_js $MAKE_FLAGS
		fi
		cd "$base"
		node --no-warnings --experimental-wasi-unstable-preview1 ./node_js/index.mjs
	;;

	cloudflare)
		if [ "$MAKE_FLAGS" != nomake ]; then
			cd ..
			make build_host_js $MAKE_FLAGS
		fi
		cd "$base/cloudflare_worker"
		yarn install
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
