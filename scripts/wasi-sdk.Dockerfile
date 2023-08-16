# See <https://github.com/WebAssembly/wasi-sdk/blob/wasi-sdk-19/Dockerfile>
# Change to debian to use the same base image as rust builder, and use packaged cmake
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
ARG WASI_SDK_REF=wasi-sdk-20
RUN git clone https://github.com/WebAssembly/wasi-sdk.git . && git checkout $WASI_SDK_REF && git submodule update --init --depth 10

RUN CC=clang CXX=clang++ NINJA_FLAGS='-j 6' make build strip
# /opt/wasi-sdk/build/install/opt/wasi-sdk

FROM scratch AS exporter
COPY --from=wasi-sdk-builder /opt/wasi-sdk/build/install/opt/wasi-sdk /
