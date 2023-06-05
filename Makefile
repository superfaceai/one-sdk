OS=$(shell uname -s)

# mode to use to build the core - can be "default", "docker" or "lax"
CORE_MODE=default
# forces the build of the core - this is the default because we let cargo decide what needs to be rebuilt, but it also runs wasm-opt needlessly if nothing has changed
CORE_PHONY=0
# builds the core in docker instead of on the host
CORE_DOCKER=0
CORE_PROFILE=debug

ifeq ($(CORE_MODE),default)
	CORE_PHONY=1
endif
ifeq ($(CORE_MODE),docker)
	CORE_PHONY=1
	CORE_DOCKER=1
endif

ifeq ($(CORE_PROFILE),release)
	CORE_FLAGS=--release
endif
ifeq ($(CORE_PROFILE),test)
	CORE_FLAGS=--features "core_mock"
endif

# WASI SDK
WASI_SDK_VERSION=20
WASI_SDK_OS=macos
WASI_SDK_FOLDER=core/wasi-sdk-${WASI_SDK_VERSION}.0
WASI_SDK_URL="https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_SDK_VERSION}/wasi-sdk-${WASI_SDK_VERSION}.0-${WASI_SDK_OS}.tar.gz"
ifeq ($(OS),Linux)
	WASI_SDK_OS=linux
endif

# Core
CORE_DIST_FOLDER=core/dist
CORE_BUILD=core/target/wasm32-wasi/${CORE_PROFILE}/superface_core.wasm
CORE_WASM=${CORE_DIST_FOLDER}/core.wasm
CORE_ASYNCIFY_WASM=${CORE_DIST_FOLDER}/core-async.wasm
CORE_JS_ASSETS=core/core/assets/js
CORE_JS_ASSETS_MAP_STD=${CORE_JS_ASSETS}/map_std.js
CORE_JS_ASSETS_PROFILE_VALIDATOR=${CORE_JS_ASSETS}/profile_validator.js
ifeq ($(CORE_PROFILE),test)
	CORE_BUILD=core/target/wasm32-wasi/debug/superface_core.wasm
	CORE_WASM=${CORE_DIST_FOLDER}/test-core.wasm
	CORE_ASYNCIFY_WASM=${CORE_DIST_FOLDER}/test-core-async.wasm
endif

# Integration
MAP_STD=integration/map-std/dist/map_std.js
PROFILE_VALIDATOR=integration/profile-validator/dist/profile_validator.js

# Hosts
HOST_JS_ASSETS=host/js/assets
ifeq ($(CORE_PROFILE),test)
	HOST_JS_ASSETS_WASM_CORE=${HOST_JS_ASSETS}/test-core-async.wasm
else
	HOST_JS_ASSETS_WASM_CORE=${HOST_JS_ASSETS}/core-async.wasm
endif

all: clean build

.DEFAULT: all
# phony these to ensure we get a fresh build of core whenever map-std changes
# sadly neither yarn nor make can just diff the map-std code and figure out if it needs a rebuild
# but maybe later we could hash (docker actually does it out of the box) or possibly use git?
ifeq ($(CORE_PHONY),1)
.PHONY: ${CORE_BUILD} ${MAP_STD} ${PROFILE_VALIDATOR}
endif

deps: deps_core
build: build_core build_integration build_hosts
test: test_core
clean: clean_core clean_integration clean_hosts

##########
## CORE ##
##########
ifeq ($(CORE_DOCKER),1)
build_core_docker: ${CORE_JS_ASSETS_MAP_STD} ${CORE_JS_ASSETS_PROFILE_VALIDATOR} ${CORE_DIST_FOLDER}
	docker build ./core -o ${CORE_DIST_FOLDER}
${CORE_WASM}: build_core_docker
${CORE_ASYNCIFY_WASM}: build_core_docker
else
deps_core: ${WASI_SDK_FOLDER}
	rustup target add wasm32-wasi
	curl https://wasmtime.dev/install.sh -sSf | bash

${CORE_BUILD}: ${WASI_SDK_FOLDER} ${CORE_JS_ASSETS_MAP_STD} ${CORE_JS_ASSETS_PROFILE_VALIDATOR}
	cd core && cargo build --package superface_core --target wasm32-wasi ${CORE_FLAGS}

${CORE_WASM}: ${CORE_BUILD} ${CORE_DIST_FOLDER}
	@echo 'Optimizing wasm...'
	wasm-opt -Oz ${CORE_BUILD} --output ${CORE_WASM}

${CORE_ASYNCIFY_WASM}: ${CORE_BUILD} ${CORE_DIST_FOLDER}
	@echo 'Running asyncify...'
	wasm-opt --strip-debug --strip-producers --strip-target-features -Oz --asyncify ${CORE_BUILD} --output ${CORE_ASYNCIFY_WASM}

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
	cd integration && yarn install && yarn workspace @superfaceai/profile-validator build

test_integration:
	cd integration && \
	yarn workspace @superfaceai/map-std test && \
	yarn workspace @superfaceai/profile-validator test

clean_integration:
	rm -rf integration/map-std/dist integration/map-std/types integration/profile-validator/dist

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

test_host_js:
	cd host/js && yarn test
