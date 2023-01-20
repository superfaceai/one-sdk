#!/bin/sh

# brew install wasm-tools

base=$(dirname "$0")

build_wat() {
	local name="$1"
	wasm-tools parse "$base/wat/$name.wat" -o "$base/wasm/$name.wasm"
}

build_asc() {
	local name="$1"

	cd "$base/$name"
	yarn install
	yarn run asbuild:release --disable bulk-memory --use abort=assembly/sf_core_unstable/abort_std
	cd -
	
	cp "$base/$name/build/release.wasm" "$base/wasm/$name.wasm"
}

case "$1" in
	wat)
		build_wat "$2"
	;;

	asc)
		build_asc "$2"
	;;
esac
