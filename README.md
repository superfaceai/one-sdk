# Webassembly prototyping

This crate represents a map interpreter implementation.

## Try it out

Requres installed rust (`cargo`) and `wasm-tools` (`brew install wasm-tools`).

Run `cargo run -- assets/wasm/first.wasm` to execute code.

Run `./assets/parse.sh first` to translate files from `assets/wat/<name>.wat` to `assets/wasm/<name>.wasm`.

## Possible interpreters

https://github.com/wasm3/wasm3-rs - native implementation is in C/C++, but does support compilation to WASM
https://github.com/paritytech/wasmi - native Rust, supports WASM target
