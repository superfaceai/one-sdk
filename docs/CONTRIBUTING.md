# How to contribute to Superface OneSDK

We welcome contributions to [OneSDK on GitHub](https://github.com/superfaceai/one-sdk).

**Please open an issue first if you want to make larger changes**

## Introduction

We are glad that you are interested in Superface in the way of contributing. We value the pro-community developers as you are.

## Need help?

If you have any question about this project (for example, how to use it) or if you just need some clarification about anything, please [open an issue](https://github.com/superfaceai/one-sdk/issues/new/choose) or check the [Support page](https://superface.ai/support) for other ways how to reach us.

## Help the community

1. [Report a Bug](#contribute-by-reporting-bugs)
2. [Contribute to the Documentation](#contribute-to-the-documentation)
3. [Make changes to the code](#contribute-code)

## Contribute by reporting bugs

If you are experiencing bug or undocumented behavior please [open an issue](https://github.com/superfaceai/one-sdk/issues/new/choose) with Bug report template.

## Contribute to the documentation

Help us improve Superface documentation, you can fix typos, improve examples and more.

The documentation inside the OneSDK repository should be kept to minimum. The [Superface documentation](https://superface.ai/docs) is hosted in the [docs repository](https://github.com/superfaceai/docs).

## Contribute code

Follow these steps:

1. **Fork & Clone** the repository
2. **Setup** follow steps in [Development requirements](#development-requirements)
3. **Update** [CHANGELOG](CHANGELOG.md). See [Keep a Changelog](https://keepachangelog.com/).
4. **Commit** changes to your own branch by convention. See [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
5. **Push** your work back up to your fork.
6. Submit a **Pull Request** so that we can review your changes.

**NOTE:** Be sure to merge the latest commits from "upstream" before making a pull request.

**NOTE:** Please open an issue first if you want to make larger changes.

### Development requirements

macOS:

```shell
# Local dependencies
brew install rustup-init
brew install binaryen # for wasm-opt

# Python host dependencies
python3 -m pip install wasmtime requests

# JS host dependencies
brew install node yarn
```

For development build with `make` from root. To create release build run `make CARGO_PROFILE=release`.

The core can also be built using Docker - see [scripts/build-a-core](../scripts/build-a-core/README.md) for more information.

### Monorepo structure

```shell
.
  Makefile # makefile with targets for development and releases/CI
  packages/
    python_host/ # Python host
    nodejs/ # NodeJS host
    cloudflare_worker_host/ # Cloudflare workers host
    javascript_common/ # shared code for JavaScript based hosts
  core/
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
    json_schemas/ # JSON schemas used by core
      Cargo.toml
      src/
        main.rs # script translating YAML to JSON
        schemas/ # actual JSON schemas
      test/ # tests for JSON Schema
    comlink_language/ # Comlink language tooling
      Cargo.toml
      src/
        parser/
  core_js/ # any tooling for integration development
    package.json # for yarn workspace configuration
    core-ffi/ # TypeScript declarations for core_to_map imports
    map-std/ # core_to_map stdlib wrappers TypeScript source
    profile-validator/ # profile validator extracted from TS SDK
  examples/
    run.sh # script to run examples
    cloudflare_worker/ # example of a cloudflare worker
    comlinks/ # example of how comlink authoring can work, including language server support for maps
      package.json # pulls in map-std types
      src/
        [.map.js files]
    nodejs/ # example of a node.js application
    python/ # example of a python application
```

## Allowed Licenses

Only the following licenses are allowed:

- 0BDS
- MIT
- Apache-2.0
- ISC
- BSD-3-Clause
- BSD-2-Clause
- CC-BY-4.0
- CC-BY-3.0;BSD
- CC0-1.0
- Unlicense

If a new dependency requires another license, just mention it in the respective issue or pull request, we will allow new licenses on the case-by-case basis.
