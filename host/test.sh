#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
cd "$base"

CORE="$base/../core/dist/core.wasm"
MAP="file://$base/../integration/examples/navigation_nearby-poi.overpass-de.suma.js"
USECASE=NearbyPoi

case $1 in
	js)

	;;

	python|py)
		python3 ./python "$CORE" "$MAP" $USECASE
	;;

	*)
		echo "usage: test.sh js|py"
		exit 1
	;;
esac
