# Webassembly prototyping

This crate represents a map interpreter implementation.

## Try it out

Requirements:
```
rustup
cargo
rustup target add wasm32-wasi
brew install wasm-tools
python3 -m pip install wasmtime requests
```

Run `./run.sh`. See its source for more commands.

### Quickjs

https://github.com/Shopify/javy

* `cd core`
* Download `wasi-sdk` from https://github.com/WebAssembly/wasi-sdk/releases
	*  `wget https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-19/wasi-sdk-19.0-macos.tar.gz`
* Unpack into the project dir and make sure directory name matches with configuration in `.cargo/config`.
	* `tar xvf wasi-sdk-19.0-macos.tar.gz`

## Development

Cargo wasi extension (`cargo install cargo-wasi`) can be used to make it easier to run tests. It requires wasmtime installed on the system as well (as opposed to just python package). Run tests with `cargo wasi test -- --nocapture` in the `core` directory.

See https://bytecodealliance.github.io/cargo-wasi/steps.html.

## Considerations

### AssemblyScript JSON library

* https://github.com/near/assemblyscript-json
	- Seems most popular
* https://github.com/gagdiez/serial-as/tree/main/json
	- Adds decorators on top of `assemblyscript-json`
* https://github.com/JairusSW/as-json
	- Directly has decorators, way less popuplar than `assemblyscript-json`
