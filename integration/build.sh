#!/bin/sh

base=$(dirname "$0")
force=${1:-0}

build() {
	local source="$1"
	local dest="$2"
	
	local mod_source=$(stat -f '%m' "$source")
	local mod_dest=$(stat -f '%m' "$dest")

	if [ "$force" -eq 0 ] && [ $mod_source -le $mod_dest ]; then
		exit 0
	fi

	echo "Transpiling '${source}'"
	yarn run -s comtrans "$source" >"$dest"
}

cd "$base/comlink-transpile"
build ./fixtures/swapi.suma ../js/swapi.suma.js
build ./fixtures/overpass-de.suma ../js/overpass-de.suma.js
build ./fixtures/github.suma ../js/github.suma.js
cd - >/dev/null
