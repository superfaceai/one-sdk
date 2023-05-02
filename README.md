# ¯\\\_(ツ)\_/¯

A simple demenonstration can be run with `./examples/run.sh node [CORE_DOCKER=1]`. It builds entire projects and Node.js host, then runs the example.

This will require to have Development requirements installed. In case of building the core in Docker `node` and `yarn` are still required.

## Development requirements

macOS:
```
# Core dependencies
brew install rustup-init
brew install binaryen # for wasm-opt

# Python host dependencies
python3 -m pip install wasmtime requests

# JS host dependencies
brew install node yarn
```

For development build with `make` from root. To create release build run `make mode=release`.

### Docker

Core can be built in docker to avoid installing compiler dependencies. Run `make CORE_DOCKER=1`.

It is also possible (but not required) to build the wasi-sdk in docker `docker build -f core/Dockerfile-wasi-sdk -o core/`, but beware that this takes a really long time.

## Monorepo structure

```shell
.
  host/
    python/
      __main__.py
      [python files]
    js/
      package.json # yarn workspace
      tsconfig.json # parent tsconfig
      common/ # common code shared between JS hosts
        package.json
        tsconfig.json
        src/
          [ts files]
      node/ # NodeJS host
        package.json
        tsconfig.json
        src/
      cloudflare/ # Cloudflare workers host
        package.json
        tsconfig.json
        src/
  core/
    .cargo/
      config
    Cargo.toml # workspace
    wasi-sdk-*/ # not in git, needed for building quickjs
    core/ # main crate, builds into core.wasm
      Cargo.toml
      src/
      assets/
        js/ # JS assets, such as the core_to_map stdlib wrappers or profile-validator (added during build)
    core_to_map_std/ # core_to_map stdlib implementation (but not export)
      Cargo.toml
      src/
    host_to_core_std/ # host_to_core stdlib import (sys) + wrappers (high-level)
      Cargo.toml
      src/
    interpreter_js/ # quickjs interpreter, core_to_map export
      Cargo.toml
      src/
  integration/ # any tooling for integration development
    package.json # for yarn workspace configuration
    core-ffi/ # TypeScript declarations for core_to_map imports
    map-std/ # core_to_map stdlib wrappers TypeScript source
      src/
    profile-validator/ # profile validator extracted from TS SDK
      src/
  examples/
    run.sh # script to run example with Basic integration example
    node_example.js # js code to run example
    Basic/ # Basic integration to demenostrate how the SDK works
      package.json # for stdlib type declarations, optional
      profile.supr # Application profile definining use-cases
      Example.js
```

## Proposal: CI pipeline flow

1. Build + test core -> cache core.wasm + core-async.wasm
2. Hosts
  - load core.wasm -> build + test python -> cache dist
  - load core-async.wasm -> build + test js -> cache dist
3. Upload artifacts and create a release
