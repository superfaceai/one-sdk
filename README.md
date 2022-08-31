# Proof of Concept: Webassembly Core

## Setup

* Have Rust (`cargo`)
* Install WASI Rust toolchain: `rustup target add wasm32-wasi`
* Have host runtimes: Deno, Python, Java (OpenJDK), NodeJS
* Initialize git submodules: `git submodule update --init --recursive`

## Usage

### Python

Status: PoC
Run: `./run.sh python [character name]`

https://bytecodealliance.github.io/wasmtime-py/

### Deno

Status: WIP
Run: `./run.sh deno`

https://deno.land/std@0.152.0/wasi/snapshot_preview1.ts?source

### NodeJS

Status: Research

https://nodejs.org/api/wasi.html

### JVM

Status: Not started

https://github.com/wasmerio/wasmer-java
https://github.com/kawamuray/wasmtime-java
https://github.com/bluejekyll/wasmtime-java
