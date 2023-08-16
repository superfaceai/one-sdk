# build-a-core

This script allows building very specific configurations of the core using Docker.

## Usage

```
usage: build-a-core [-c CORES_FILE] build [-h] [--o OUT_DIR] NAMES [NAMES ...]

positional arguments:
  NAMES                 Names of the core descriptions

options:
  -h, --help            show this help message and exit
  --o OUT_DIR, --out-dir OUT_DIR
                        Path to where to the cores
```

Defaults:
* `CORES_FILE` is `<script root>/cores.json`
* `OUT_DIR` is `<script root>/out`

### Example

Run `python3 scripts/build-a-core build current current-deps-update`. This will run docker and create `scripts/build-a-core/out/{current.wasm, current-deps-update.wasm}`.

## Parameters

The following parameters can be configured. Each configuration is stored in `cores.json` file.

### Dependencies

Dependencies of the build to be downloaded.

| key | values | description |
|-----|--------|-------------|
| `toolchain-version` | like `1.71`, `nightly-2023-08-14` | Version of the Rust toolchain used to compile the core. |
| `core-ref` | git ref | Git ref of the one-sdk repo to check out. |
| `wasi-sdk-ref` | git ref | Git ref of the wasi-sdk repo to check out. |
| `binaryen-ref` | git ref | Git ref of the binaryen repo to check out. |

### Cargo profile

The script creates a custom Cargo build profile to build the custom core.

| key | values | description |
|-----|--------|-------------|
| `opt-level` | `1`, `2`, `3`, `s`, `z` | Opt level used in the custom cargo profile. |
| `debug-info` | `none`, `line-directives-only`, `line-tables-only`, `limited`, `full` | Amount of debug information included in the compiled binary. |
| `strip` | `none`, `debuginfo`, `symbols` | What to strip from the binary. |
| `debug-assertions` | bool | Whether to enable debug assertions. |
| `overflow-checks` | bool | Whether to enable overflow checks. |
| `lto` | `off`, `thin`, `fat` | Link time optimization level. |
| `panic` | `unwind`, `abort` | Whether to unwind or abort on panics. |
| `codegen-units` | positive number | Number of parallel codegen units. |

Notes:
* More info <https://doc.rust-lang.org/cargo/reference/profiles.html>
* `strip`=`symbols` usually doesn't work with wasm-opt
* `panic`=`unwind` has no effect on wasm, `abort` is always used

### Build std

Whether to build the Rust standard library as a part of the build.

| key | values | description |
|-----|--------|-------------|
| `enabled` | bool | Whether to enable building of Rust std |
| `crates` | set of `std`, `core`, `alloc`, `proc_macro`, `panic_unwind`, `panic_abort`, `compiler_builtins` | std crates to build, some crates might enable other crates anyway |
| `features` | optional, set of features | Set of features to enable on the std crate. |

Notes:
* **Requires** a nightly compiler.
* `crates` must contain `panic_abort`
* `features` defined here <https://github.com/rust-lang/rust/blob/master/library/std/Cargo.toml#L51>.

### Wasm opt

Whether to build and run wasm-opt as a post-process operation.

| key | values | description |
|-----|--------|-------------|
| `enabled` | bool | Whether to enable building and invoking wasm-opt. |
| `opt-level` | `1`, `2`, `3`, `4`, `s`, `z` | Opt level passed to wasm-opt. |
| `converge` | bool | Whether to run wasm-opt until the result is stable. |
| `asyncify` | bool | Whether to asyncify the core. |
| `strip-debug` | bool | Whether to run `strip-debug` pass. |
| `strip-dwarf` | bool | Whether to run `strip-dwarf` pass. |
| `strip-eh` | bool | Whether to run `strip-eh` pass. |
| `strip-producers` | bool | Whether to run `strip-producers` pass. |
| `strip-target-features` | bool | Whether to run `strip-target-features` pass. |

Notes:
* `strip-eh` requires as least version `114`

## Docker cache

Docker is used mainly for its caching. However, since many separate configurations are built the cache size can grow very fast. Some useful commands to inspect docker cache are:
* `docker builder du` - show how much space is consumed by downloaded images, caches and the like
* `docker builder prune` - clean up Docker builder caches
