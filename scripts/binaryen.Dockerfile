FROM debian:bookworm as binaryen-builder

ENV DEBIAN_FRONTEND=noninteractive
RUN <<EOF
	set -e
	apt update
	apt install -y --no-install-recommends ca-certificates build-essential clang python3 git cmake
	apt clean
	rm -rf /var/lib/apt/lists/*
EOF

WORKDIR /opt/binaryen
ARG BINARYEN_REF=version_114
RUN git clone https://github.com/WebAssembly/binaryen.git . && git checkout $BINARYEN_REF && git submodule update --init --depth 10

RUN CC=clang CXX=clang++ cmake -DBUILD_TESTS=OFF . && make -j 6
# /opt/binaryen/bin and /opt/binaryen/lib

FROM scratch AS exporter
COPY --from=binaryen-builder /opt/binaryen/bin /bin
COPY --from=binaryen-builder /opt/binaryen/lib /lib
