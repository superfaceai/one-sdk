OS=$(shell uname -s)

ifeq ($(MODE),release)
	FLAGS=--release
else
	MODE=debug
	FLAGS=
endif

# WASI SDK
WASI_SDK_VERSION=20
ifeq ($(OS),Linux)
	WASI_SDK_OS=linux
else
	WASI_SDK_OS=macos
endif
WASI_SDK_FOLDER=core/wasi-sdk-${WASI_SDK_VERSION}.0
WASI_SDK_URL="https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_SDK_VERSION}/wasi-sdk-${WASI_SDK_VERSION}.0-${WASI_SDK_OS}.tar.gz"

# Core
CORE_BUILD=core/target/wasm32-wasi/${MODE}/superface_core.wasm
CORE_DIST_FOLDER=core/dist
CORE_WASM=${CORE_DIST_FOLDER}/core.wasm
CORE_ASYNCIFY_WASM=${CORE_DIST_FOLDER}/core-async.wasm
CORE_JS_ASSETS=core/core/assets/js
CORE_JS_ASSETS_MAP_STD=${CORE_JS_ASSETS}/map_std.js
CORE_JS_ASSETS_PROFILE_VALIDATOR=${CORE_JS_ASSETS}/profile_validator.js

# Integration
MAP_STD=integration/map-std/dist/map_std.js
PROFILE_VALIDATOR=integration/profile-validator/dist/profile_validator.js

# Hosts
HOST_JS_ASSETS=host/js/assets
HOST_JS_ASSETS_WASM_CORE=${HOST_JS_ASSETS}/core-async.wasm

all: clean build

.DEFAULT: all
# phony these to ensure we get a fresh build of core whenever map-std changes
# sadly neither yarn nor make can just diff the map-std code and figure out if it needs a rebuild
# but maybe later we could hash (docker actually does it out of the box) or possibly use git?
.PHONY: ${CORE_BUILD} ${MAP_STD} ${PROFILE_VALIDATOR}

deps: deps_core deps_integration deps_hosts
build: build_core build_integration build_hosts
test: test_core
clean: clean_core clean_integration clean_hosts

##########
## CORE ##
##########
ifdef CORE_DOCKER
build_core_docker: ${CORE_JS_ASSETS_MAP_STD} ${CORE_JS_ASSETS_PROFILE_VALIDATOR} ${CORE_DIST_FOLDER}
	docker build ./core -o ${CORE_DIST_FOLDER}
${CORE_WASM}: build_core_docker
${CORE_ASYNCIFY_WASM}: build_core_docker
else
deps_core: ${WASI_SDK_FOLDER}
	rustup target add wasm32-wasi

${CORE_BUILD}: ${WASI_SDK_FOLDER} ${CORE_JS_ASSETS_MAP_STD} ${CORE_JS_ASSETS_PROFILE_VALIDATOR}
	cd core && cargo build --package superface_core --target wasm32-wasi ${FLAGS}
${CORE_WASM}: ${CORE_BUILD} ${CORE_DIST_FOLDER}
	@echo 'Optimizing wasm...'
	wasm-opt -O2 ${CORE_BUILD} --output ${CORE_WASM}
${CORE_ASYNCIFY_WASM}: ${CORE_BUILD} ${CORE_DIST_FOLDER}
	@echo 'Running asyncify...'
	wasm-opt -O2 --asyncify --pass-arg=asyncify-asserts ${CORE_BUILD} --output ${CORE_ASYNCIFY_WASM}
${WASI_SDK_FOLDER}:
	wget -qO - ${WASI_SDK_URL} | tar xzvf - -C core

test_core: ${WASI_SDK_FOLDER} ${CORE_JS_ASSETS_MAP_STD} ${CORE_JS_ASSETS_PROFILE_VALIDATOR}
	cd core && cargo test -- -- --nocapture
endif
build_core: ${CORE_WASM} ${CORE_ASYNCIFY_WASM}

${CORE_JS_ASSETS_MAP_STD}: ${MAP_STD}
	mkdir -p ${CORE_JS_ASSETS}
	cp ${MAP_STD} ${CORE_JS_ASSETS_MAP_STD}

${CORE_JS_ASSETS_PROFILE_VALIDATOR}: ${PROFILE_VALIDATOR}
	mkdir -p ${CORE_JS_ASSETS}
	cp ${PROFILE_VALIDATOR} ${CORE_JS_ASSETS_PROFILE_VALIDATOR}

${CORE_DIST_FOLDER}:
	mkdir -p ${CORE_DIST_FOLDER}

clean_core:
	rm -rf ${CORE_DIST_FOLDER} core/target

#################
## INTEGRATION ##
#################
build_integration: ${MAP_STD} ${PROFILE_VALIDATOR}

${MAP_STD}:
	cd integration && yarn install && yarn workspace @superfaceai/map-std build

${PROFILE_VALIDATOR}:
	cd integration && yarn install && yarn workspace profile-validator build

clean_integration:
	rm -rf integration/map-std/dist integration/profile-validator/dist

##########
## HOST ##
##########
build_hosts: build_host_js
clean_hosts:
	rm -rf ${HOST_JS_ASSETS}
	cd host/js && yarn clean

# copy wasm always because cached docker artifacts can have older timestamp
build_host_js: ${CORE_ASYNCIFY_WASM}
	mkdir -p ${HOST_JS_ASSETS}
	cp ${CORE_ASYNCIFY_WASM} ${HOST_JS_ASSETS_WASM_CORE}
	cd host/js && yarn install && yarn build	
