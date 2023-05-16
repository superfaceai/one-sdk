[Website](https://superface.ai) | [Get Started](https://superface.ai/docs/getting-started) | [Documentation](https://superface.ai/docs) | [Discord](https://sfc.is/discord) | [Twitter](https://twitter.com/superfaceai) | [Support](https://superface.ai/support)

<img src="https://github.com/superfaceai/poc-webassembly/raw/main/docs/LogoGreen.png" alt="Superface" width="100" height="100">

# Superface OneSDK

**One SDK for all the APIs you want to integrate with.**

This is a new implementation of [OneSDK for Node.js](https://github.com/superfaceai/one-sdk-js) using WebAssembly under the hood. Which allows us to give users OneSDK in their favorite language.

For more details about Superface, visit [How it Works](https://superface.ai/how-it-works) and [Get Started](https://superface.ai/docs/getting-started).

## Try it out

A simple demenonstration can be run with `./examples/run.sh node [CORE_MODE=default|docker|lax]`. It builds entire projects and Node.js host, then runs the example.

This will require to have Development requirements installed. In case of building the core in Docker `node` and `yarn` are still required.

## Development requirements

macOS:
```
# Core dependencies
brew install docker
# or dependencies locally
brew install rustup-init
brew install binaryen # for wasm-opt

# Python host dependencies
python3 -m pip install wasmtime requests

# JS host dependencies
brew install node yarn
```

For development build with `make` from root. To create release build run `make CORE_PROFILE=release`.

### Docker

Core can be built in docker to avoid installing compiler dependencies. Run `make CORE_MODE=docker`.

It is also possible (but not required) to build the wasi-sdk in docker `docker build -f core/Dockerfile-wasi-sdk -o core/`, but beware that this takes a really long time.

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
      assets/ # contains core wasm
      src/
        common/ # common code shared between JS hosts
          [ts files]
        node/ # NodeJS host
          [ts files]
        cloudflare/ # Cloudflare workers host
          [ts files]
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
    run.sh # script to run examples
    node_example.mjs # js code to run example
    Basic/ # Basic integration to demenostrate how the SDK works
    cloudflare_worker/ # example of cloudflare worker
    maps/ # example of how map authoring can look
      package.json # pulls in map-std types
      src/
        [.suma.js files]
```