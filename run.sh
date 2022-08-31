#!/bin/sh

host=${1:-deno}
shift

base=$(realpath "$0")
base=$(dirname "$base")

mkdir -p "${base}/workdir"
host_log="${base}/workdir/host.log"
guest_log="${base}/workdir/guest.log"

wasm="target/wasm32-wasi/debug/guest_bin.wasm"

cd "${base}/guest_rust"
cargo build

case "$host" in
	deno)
		printf "\n>>> HOST <<<\n"
		deno run --allow-env --allow-read ../host_deno/run.ts "$wasm" "$@" 2>"$guest_log" | tee "$host_log"

		printf "\n>>> GUEST <<<\n"
		cat "$guest_log"
	;;

	nodejs)

	;;

	python)
		printf "\n>>> HOST <<<\n"
		python3 ../host_python/main.py "$wasm" "$@" 2>"$guest_log" | tee "$host_log"

		printf "\n>>> GUEST <<<\n"
		cat "$guest_log"
	;;

	kotlin)

	;;

	*)
		echo "usage: run.sh deno"
		exit 1
	;;
esac

cd - >/dev/null