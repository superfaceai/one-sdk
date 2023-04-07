#!/bin/sh

set -e
base=$(dirname "$0")
base=$(realpath "$base")

CORE_ASSETS="$base/../core/core/assets"

cd "$base/map-std"
yarn build
cp dist/map_std.js "$CORE_ASSETS/js"

cd "$base/profile-validator"
yarn build
cp dist/profile_validator.js "$CORE_ASSETS/js"
