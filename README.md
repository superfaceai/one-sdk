## NodeJS

https://nodejs.org/api/wasi.html

## Python, Rust

https://github.com/bytecodealliance/wasmtime

## Java

https://github.com/wasmerio/wasmer-java
https://github.com/kawamuray/wasmtime-java
https://github.com/bluejekyll/wasmtime-java

##

`git submodule update --init --recursive`

```
deno run --allow-env --allow-read ../host_deno/run.ts target/wasm32-wasi/debug/guest_rust.wasm
node --experimental-wasi-unstable-preview1 ../host_nodejs/run.mjs target/wasm32-wasi/debug/guest_rust.wasm
```