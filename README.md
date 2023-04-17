## Try it out

Core can be built in docker to avoid installing compiler dependencies. Run `docker build core -o core/dist` (or on arm64 `docker build core -f core/Dockerfile-arm64 -o core/dist`, but beware that this takes a really long time as it builds wasi-sdk, including clang).

A very simple smoke test can be run `host/test.sh py` - should perform NearbyPoi against overpass-de and return an Ok result. 

## Development requirements

macOS:
```
# Core dependencies
brew install rustup-init
brew install binaryen # for wasm-opt
rustup target add wasm32-wasi
# run from repo root (or extract so that there is `core/wasi-sdk-19.0`)
wget -qO - https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-20/wasi-sdk-20.0-macos.tar.gz | tar xvf - -C core
# TODO: clang must also be installed on the system (for C headers)

# Python host dependencies
python3 -m pip install wasmtime requests

# JS host dependencies
brew install node
```

Build with `./core/build.sh`, result will be in `core/dist`. Note that this builds the debug version (as opposed to the Dockerfile building release), so it will be way bigger.

## Monorepo structure

```shell
.
  host/
    python/
      __main__.py
      [python files]
    js/
      package.json
      tsconfig.json
      src/
        [ts files]
  core/
    .cargo/
      config
    Cargo.toml # workspace
    wasi-sdk-19.0/ # not in git, needed for building quickjs
    host_to_core_std/ # host_to_core stdlib import (sys) + wrappers (high-level)
      Cargo.toml
      src/
    core_to_map_std/ # core_to_map stdlib implementation (but not export)
      Cargo.toml
      src/
    interpreter_js/ # quickjs interpreter, core_to_map export
      Cargo.toml
      src/
      map_std/ # core_to_map stdlib import + wrappers
        std_unstable.js
    core/ # main crate, builds into core.wasm
      Cargo.toml
      src/
      assets/
        js/ # JS assets, such as the core_to_map stdlib wrappers or profile-validator
    build.sh # calls `cargo build` but also `wasm-opt --asyncify ..`
  integration/ # any tooling for integration development
    core-ffi/ # TypeScript declarations for core_to_map imports
    map-std/ # core_to_map stdlib wrappers TypeScript source
      src/
    profile-validator/ # profile validator extracted from TS SDK
      src/
    examples/ # example integrations
      character-information/
        swapi/
          package.json # for stdlib type declarations, optional
          character-information.swapi.js
```

## Proposal: CI pipeline flow

1. Build + test core -> cache core.wasm + core-async.wasm
2. Hosts
  - load core.wasm -> build + test python -> cache dist
  - load core-async.wasm -> build + test js -> cache dist
3. Upload artifacts and create a release
