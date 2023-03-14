#!/bin/sh

base=$(dirname "$0")
base=$(realpath "$base")
station=${1}

if ! [ -d "$station" ]; then
	echo "usage: fake.sh PATH_TO_STATION"
	exit 1
fi

testing="$station/node_modules/@superfaceai/testing"
rm -r "$testing"
ln -sf "$base" "$testing"
