FROM rust:1.68 as builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && apt install -y binaryen clang libclang-dev && rm -rf /var/lib/apt/lists/*
RUN rustup target add wasm32-wasi

WORKDIR /usr/src/superface_core
ENV QUICKJS_WASM_SYS_WASI_SDK_PATH=/usr/src/superface_core/wasi-sdk-20.0

# inline scripts go brr
ARG BUILDPLATFORM
RUN if [ "$BUILDPLATFORM" = "linux/arm64" ]; then \
		wget -qO - https://github.com/TheEdward162/wasi-sdk/releases/download/v20-linux.arm64/wasi-sdk-20.0-linux-arm64.tar.gz | tar xzf -; \
	else \
		wget -qO - https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-20/wasi-sdk-20.0-linux.tar.gz | tar xzf -; \
	fi

COPY ./Cargo.toml ./Cargo.lock ./
COPY ./host_to_core_std ./host_to_core_std
COPY ./core_to_map_std ./core_to_map_std
COPY ./interpreter_js ./interpreter_js
COPY ./core ./core

ENV CARGO_HOME=/var/cache/cargo
ENV CARGO_TARGET_DIR=/var/cache/target
# TODO: also run tests?
RUN --mount=type=cache,target=/var/cache/cargo --mount=type=cache,target=/var/cache/target \
	cargo build --locked --package superface_core --release --target wasm32-wasi && \
	mkdir -p /opt/superface/ && cp '/var/cache/target/wasm32-wasi/release/superface_core.wasm' '/opt/superface/core.wasm'

WORKDIR /opt/superface
RUN wasm-opt -O2 ./core.wasm --output ./core.wasm
# TODO: restore when stabilised --pass-arg asyncify-imports@sf_host_unstable.message_exchange,sf_host_unstable.stream_read,sf_host_unstable.stream_write
RUN wasm-opt -O2 --asyncify ./core.wasm --output ./core-async.wasm

FROM scratch AS exporter
COPY --from=builder /opt/superface/core.wasm /opt/superface/core-async.wasm /
