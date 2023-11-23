OS=$(shell uname -s)

# mode to use to build the core - can be "default", "docker" or "lax"
CORE_MODE=default
# forces the build of the core - this is the default because we let cargo decide what needs to be rebuilt, but it also runs wasm-opt needlessly if nothing has changed
CORE_PHONY=0
CORE_PROFILE=debug

ifeq ($(CORE_MODE),default)
	CORE_PHONY=1
else ifneq ($(CORE_MODE),lax)
$(error "CORE_MODE must be one of [default, docker, lax]")
endif

ifeq ($(CORE_PROFILE),release)
	CORE_FLAGS=--release
	WASM_OPT_FLAGS=--strip-debug --strip-producers
endif

# WASI SDK
WASI_SDK_OS=macos
ifeq ($(OS),Linux)
	WASI_SDK_OS=linux
endif
WASI_SDK_VERSION=20
WASI_SDK_FOLDER=core/wasi-sdk-${WASI_SDK_VERSION}.0
WASI_SDK_URL="https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_SDK_VERSION}/wasi-sdk-${WASI_SDK_VERSION}.0-${WASI_SDK_OS}.tar.gz"

# Core
CORE_DIST=core/dist
CORE_WASM=${CORE_DIST}/core.wasm
CORE_ASYNCIFY_WASM=${CORE_DIST}/core-async.wasm
# Test core
TEST_CORE_WASM=${CORE_DIST}/test-core.wasm
TEST_CORE_ASYNCIFY_WASM=${CORE_DIST}/test-core-async.wasm
# Core JS
CORE_JS_ASSETS=core/core/assets/js
CORE_JS_ASSETS_MAP_STD=${CORE_JS_ASSETS}/map_std.js
CORE_JS_ASSETS_PROFILE_VALIDATOR=${CORE_JS_ASSETS}/profile_validator.js
MAP_STD=core_js/map-std/dist/map_std.js
PROFILE_VALIDATOR=core_js/profile-validator/dist/profile_validator.js
CORE_SCHEMA_ASSETS=core/core/assets/schemas
CORE_SCHEMA_ASSETS_SECURITY_VALUES=${CORE_SCHEMA_ASSETS}/security_values.json
CORE_SCHEMA_ASSETS_PARAMETERS_VALUES=${CORE_SCHEMA_ASSETS}/parameters_values.json
SECURITY_VALUES_JSON_SCHEMA=core/json_schemas/src/schemas/security_values.json
PARAMETERS_VALUES_JSON_SCHEMA=core/json_schemas/src/schemas/parameters_values.json
# packages
NODEJS_HOST_ASSETS=packages/nodejs_host/assets
CFW_HOST_ASSETS=packages/cloudflare_worker_host/assets
PYTHON_HOST_ASSETS=packages/python_host/src/one_sdk/assets

all: clean build

.DEFAULT: all
# phony these to ensure we get a fresh build of core whenever map-std changes
# sadly neither yarn nor make can just diff the map-std code and figure out if it needs a rebuild
# but maybe later we could hash (docker actually does it out of the box) or possibly use git?
ifeq ($(CORE_PHONY),1)
.PHONY: ${CORE_DIST} ${MAP_STD} ${PROFILE_VALIDATOR}
endif

deps: git_hooks deps_core deps_packages
build: build_core build_core_js build_packages
test: test_core test_packages
clean: clean_core clean_core_js

git_hooks:
	cp .githooks/* .git/hooks

##########
## CORE ##
##########
deps_core: ${WASI_SDK_FOLDER}
	rustup target add wasm32-wasi
	curl https://wasmtime.dev/install.sh -sSf | bash

${CORE_DIST}: ${WASI_SDK_FOLDER} ${CORE_JS_ASSETS_MAP_STD} ${CORE_JS_ASSETS_PROFILE_VALIDATOR} ${CORE_SCHEMA_ASSETS_SECURITY_VALUES} ${CORE_SCHEMA_ASSETS_PARAMETERS_VALUES}
	mkdir -p ${CORE_DIST}
	touch ${CORE_DIST}

${CORE_WASM}: ${CORE_DIST}
	cd core; cargo build --package oneclient_core --target wasm32-wasi ${CORE_FLAGS}
	@echo 'Optimizing wasm...'
	wasm-opt -Oz ${WASM_OPT_FLAGS} core/target/wasm32-wasi/${CORE_PROFILE}/oneclient_core.wasm --output ${CORE_WASM}

${TEST_CORE_WASM}: ${CORE_DIST}
	cd core; cargo build --package oneclient_core --target wasm32-wasi --features "core_mock"
	cp core/target/wasm32-wasi/debug/oneclient_core.wasm ${TEST_CORE_WASM}

${CORE_ASYNCIFY_WASM}: ${CORE_WASM}
	@echo 'Running asyncify...'
	wasm-opt -Oz ${WASM_OPT_FLAGS} --asyncify ${CORE_WASM} --output ${CORE_ASYNCIFY_WASM}
	
${TEST_CORE_ASYNCIFY_WASM}: ${TEST_CORE_WASM}
	wasm-opt -Os --asyncify ${TEST_CORE_WASM} --output ${TEST_CORE_ASYNCIFY_WASM}

${WASI_SDK_FOLDER}:
	wget -qO - ${WASI_SDK_URL} | tar xzvf - -C core

test_core: ${WASI_SDK_FOLDER} ${CORE_JS_ASSETS_MAP_STD} ${CORE_JS_ASSETS_PROFILE_VALIDATOR} ${CORE_SCHEMA_ASSETS_SECURITY_VALUES} ${CORE_SCHEMA_ASSETS_PARAMETERS_VALUES}
	cd core && cargo test -- -- --nocapture

build_core: ${CORE_WASM} ${TEST_CORE_WASM} ${CORE_ASYNCIFY_WASM} ${TEST_CORE_ASYNCIFY_WASM}
build_core_json_schemas:
	cd core/json_schemas && cargo build && wasmtime run --dir=. ../target/wasm32-wasi/debug/json_schemas.wasm

${CORE_JS_ASSETS_MAP_STD}: ${MAP_STD}
	mkdir -p ${CORE_JS_ASSETS}
	cp ${MAP_STD} ${CORE_JS_ASSETS_MAP_STD}

${CORE_JS_ASSETS_PROFILE_VALIDATOR}: ${PROFILE_VALIDATOR}
	mkdir -p ${CORE_JS_ASSETS}
	cp ${PROFILE_VALIDATOR} ${CORE_JS_ASSETS_PROFILE_VALIDATOR}

${CORE_SCHEMA_ASSETS_SECURITY_VALUES}:
	mkdir -p ${CORE_SCHEMA_ASSETS}
	cp ${SECURITY_VALUES_JSON_SCHEMA} ${CORE_SCHEMA_ASSETS_SECURITY_VALUES}

${CORE_SCHEMA_ASSETS_PARAMETERS_VALUES}:
	mkdir -p ${CORE_SCHEMA_ASSETS}
	cp ${PARAMETERS_VALUES_JSON_SCHEMA} ${CORE_SCHEMA_ASSETS_PARAMETERS_VALUES}

clean_core:
	rm -rf ${CORE_DIST} core/target

#############
## Core JS ##
#############
build_core_js: ${MAP_STD} ${PROFILE_VALIDATOR}

${MAP_STD}:
	cd core_js && yarn install && yarn workspace @superfaceai/map-std build
${PROFILE_VALIDATOR}:
	cd core_js && yarn install && yarn workspace @superfaceai/profile-validator build
test_core_js:
	cd core_js && \
	yarn workspace @superfaceai/map-std test && \
	yarn workspace @superfaceai/profile-validator test
clean_core_js:
	rm -rf core_js/map-std/dist core_js/map-std/types core_js/profile-validator/dist

##############
## PACKAGES ##
##############
build_packages: build_python_host build_nodejs_host build_cfw_host
deps_packages: deps_python_host deps_nodejs_host deps_cfw_host
test_packages: test_nodejs_host test_cfw_host test_python_host

# Node.js Host
deps_nodejs_host:
	cd packages/nodejs_host && yarn install
build_nodejs_host: deps_nodejs_host ${CORE_ASYNCIFY_WASM}
	mkdir -p ${NODEJS_HOST_ASSETS}
	cp ${CORE_ASYNCIFY_WASM} ${NODEJS_HOST_ASSETS}/core-async.wasm
	cd packages/nodejs_host && yarn build	
test_nodejs_host: build_nodejs_host ${TEST_CORE_ASYNCIFY_WASM}
	cp ${TEST_CORE_ASYNCIFY_WASM} ${NODEJS_HOST_ASSETS}/test-core-async.wasm
	cd packages/nodejs_host && yarn test

# Cloudflare worker Host
deps_cfw_host:
	cd packages/cloudflare_worker_host && yarn install
build_cfw_host: deps_cfw_host ${CORE_ASYNCIFY_WASM}
	mkdir -p ${CFW_HOST_ASSETS}
	cp ${CORE_ASYNCIFY_WASM} ${CFW_HOST_ASSETS}/core-async.wasm
	cd packages/cloudflare_worker_host && yarn build	
test_cfw_host: build_cfw_host ${TEST_CORE_ASYNCIFY_WASM}
	cp ${TEST_CORE_ASYNCIFY_WASM} ${CFW_HOST_ASSETS}/test-core-async.wasm
	cd packages/cloudflare_worker_host && yarn test

# Python Host
deps_python_host:
	cd packages/python_host; test -d venv || python3 -m venv venv; source venv/bin/activate; \
	python3 -m pip install -e .
build_python_host: deps_python_host ${CORE_WASM}
	mkdir -p ${PYTHON_HOST_ASSETS}
	cp ${CORE_WASM} ${PYTHON_HOST_ASSETS}/core.wasm
	# TODO: build?
test_python_host: build_python_host ${TEST_CORE_WASM}
	cp ${TEST_CORE_WASM} ${PYTHON_HOST_ASSETS}/test-core.wasm
	cd packages/python_host; source venv/bin/activate; \
	python3 -m unittest discover tests/

build_map_std_package: ${MAP_STD}
	cp -r core_js/map-std/types packages/map_std/
