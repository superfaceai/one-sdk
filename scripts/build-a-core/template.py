from typing import Optional

def dockerfile_template(
	name: str,
	toolchain_version: str,
	core_ref: str,
	wasi_sdk_ref: str,
	binaryen_ref: str,
	cargo_profile: str,
	build_std_flags: str,
	wasm_opt_flags: str
):
	CARGO_TARGET_DIR = f"/var/cache/target/{name}"
	OPT_BINARYEN = "/opt/binaryen"
	
	cargo_profile = cargo_profile.replace("\n", "\\n").replace('"', '\\"')
	
	if wasm_opt_flags != "":
		post_process = f"{OPT_BINARYEN}/bin/wasm-opt {wasm_opt_flags} {CARGO_TARGET_DIR}/wasm32-wasi/build-a-core/oneclient_core.wasm --output /opt/build-a-core/core.wasm"
	else:
		post_process = f"cp {CARGO_TARGET_DIR}/wasm32-wasi/build-a-core/oneclient_core.wasm /opt/build-a-core/core.wasm"

	return f"""
FROM debian:bookworm as wasi-sdk-builder

ENV DEBIAN_FRONTEND=noninteractive
RUN <<EOF
	set -e
	apt update
	apt install -y --no-install-recommends ccache curl ca-certificates build-essential clang python3 git ninja-build cmake
	apt clean
	rm -rf /var/lib/apt/lists/*
EOF

WORKDIR /opt/wasi-sdk
ARG WASI_SDK_REF={wasi_sdk_ref}
RUN git clone https://github.com/WebAssembly/wasi-sdk.git . && git checkout $WASI_SDK_REF && git submodule update --init --depth 10

RUN CC=clang CXX=clang++ NINJA_FLAGS='-j 6' make build strip
# /opt/wasi-sdk/build/install/opt/wasi-sdk

FROM debian:bookworm as binaryen-builder

ENV DEBIAN_FRONTEND=noninteractive
RUN <<EOF
	set -e
	apt update
	apt install -y --no-install-recommends ca-certificates build-essential clang git cmake
	apt clean
	rm -rf /var/lib/apt/lists/*
EOF

WORKDIR /opt/binaryen
ARG BINARYEN_REF={binaryen_ref}
RUN git clone https://github.com/WebAssembly/binaryen.git . && git checkout $BINARYEN_REF && git submodule update --init --depth 10

RUN CC=clang CXX=clang++ cmake -DBUILD_TESTS=OFF . && make -j 6
# /opt/binaryen/bin and /opt/binaryen/lib

FROM rust:bookworm as core-builder
# we use rust base image to get rustup and other basic dependencies

ENV DEBIAN_FRONTEND=noninteractive
RUN <<EOF
	set -e
	apt update
	apt install -y --no-install-recommends ca-certificates build-essential git clang libclang-dev yarnpkg make
	apt clean
	rm -rf /var/lib/apt/lists/*
EOF
RUN rustup default {toolchain_version} && rustup component add rust-src && rustup target add wasm32-wasi

WORKDIR /opt/build-a-core
RUN git clone https://github.com/superfaceai/one-sdk.git . && git checkout {core_ref}
RUN <<EOF
set -e
mkdir -p core/core/assets/js core/core/assets/schemas

if [ -d core/json_schemas/src/schemas ]; then
	cp core/json_schemas/src/schemas/*.json core/core/assets/schemas
fi

cd integration
yarnpkg install
yarnpkg workspace @superfaceai/map-std build
cp map-std/dist/map_std.js ../core/core/assets/js
if [ -d ./profile-validator ]; then
	yarnpkg workspace @superfaceai/profile-validator build
	cp profile-validator/dist/profile_validator.js ../core/core/assets/js
fi
EOF

WORKDIR /opt/build-a-core/core
ENV QUICKJS_WASM_SYS_WASI_SDK_PATH=/opt/build-a-core/core/wasi-sdk
COPY --from=wasi-sdk-builder /opt/wasi-sdk/build/install/opt/wasi-sdk $QUICKJS_WASM_SYS_WASI_SDK_PATH/

ENV CARGO_HOME=/var/cache/cargo
ENV CARGO_TARGET_DIR={CARGO_TARGET_DIR}
RUN echo "{cargo_profile}" >>Cargo.toml
RUN --mount=type=cache,target=/var/cache/cargo cargo build --target wasm32-wasi --package oneclient_core --profile build-a-core {build_std_flags}

COPY --from=binaryen-builder /opt/binaryen/bin {OPT_BINARYEN}/bin
COPY --from=binaryen-builder /opt/binaryen/lib {OPT_BINARYEN}/lib
RUN {post_process}
# /opt/build-a-core/core.wasm

FROM scratch AS exporter
COPY --from=core-builder /opt/build-a-core/core.wasm /{name}.wasm
"""
