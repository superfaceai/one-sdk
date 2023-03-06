# JS interpreter in Rust WASI

https://github.com/Shopify/javy

## Setup

* Download `wasi-sdk` from https://github.com/WebAssembly/wasi-sdk/releases
	*  `wget https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-19/wasi-sdk-19.0-macos.tar.gz`
* Unpack into the project dir and make sure directory name matches with configuration in `.cargo/config`.
	* `tar xvf wasi-sdk-19.0-macos.tar.gz`
* `cargo wasi test`
