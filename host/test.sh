#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

CORE="$base/../core/dist/core.wasm"
CORE_ASYNC="$base/../core/dist/core-async.wasm"
MAP="file://$base/../integration/examples/navigation_nearby-poi.overpass-de.suma.js"
PROFILE="file://$base/../integration/examples/navigation_nearby-poi.supr"
USECASE=NearbyPoi

case $1 in
	js)
		cd js
		yarn build
		node --experimental-wasi-unstable-preview1 dist/index_node.js "$CORE_ASYNC" "$PROFILE" "$MAP" $USECASE
	;;

	python|py)
		python3 ./python "$CORE" "$PROFILE" "$MAP" $USECASE
	;;

	*)
		echo "usage: test.sh js|py"
		exit 1
	;;
esac
