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
else ifeq ($(CORE_MODE),docker)
	CORE_PHONY=1
	CORE_DOCKER=1
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
# Integration
CORE_JS_ASSETS=core/core/assets/js
CORE_JS_ASSETS_MAP_STD=${CORE_JS_ASSETS}/map_std.js
CORE_JS_ASSETS_PROFILE_VALIDATOR=${CORE_JS_ASSETS}/profile_validator.js
MAP_STD=integration/map-std/dist/map_std.js
PROFILE_VALIDATOR=integration/profile-validator/dist/profile_validator.js
CORE_SCHEMA_ASSETS=core/core/assets/schemas
CORE_SCHEMA_ASSETS_SECURITY_VALUES=${CORE_SCHEMA_ASSETS}/security_values.json
CORE_SCHEMA_ASSETS_PARAMETERS_VALUES=${CORE_SCHEMA_ASSETS}/parameters_values.json
SECURITY_VALUES_JSON_SCHEMA=core/json_schemas/src/schemas/security_values.json
PARAMETERS_VALUES_JSON_SCHEMA=core/json_schemas/src/schemas/parameters_values.json
# Hosts
HOST_JAVASCRIPT_ASSETS=host/javascript/assets
HOST_PYTHON_ASSETS=host/python/src/one_sdk/assets

all: clean build

.DEFAULT: all
# phony these to ensure we get a fresh build of core whenever map-std changes
# sadly neither yarn nor make can just diff the map-std code and figure out if it needs a rebuild
# but maybe later we could hash (docker actually does it out of the box) or possibly use git?
ifeq ($(CORE_PHONY),1)
.PHONY: ${CORE_DIST} ${MAP_STD} ${PROFILE_VALIDATOR}
endif

deps: git_hooks deps_core deps_host_python
build: build_core build_integration build_hosts
test: test_core
clean: clean_core clean_integration clean_hosts

git_hooks:
	cp .githooks/* .git/hooks

##########
## CORE ##
##########
ifeq ($(CORE_DOCKER),1)
${CORE_DIST}: ${CORE_JS_ASSETS_MAP_STD} ${CORE_JS_ASSETS_PROFILE_VALIDATOR} ${CORE_SCHEMA_ASSETS_SECURITY_VALUES} ${CORE_SCHEMA_ASSETS_PARAMETERS_VALUES}
	mkdir -p ${CORE_DIST}
	docker build ./core -o ${CORE_DIST}
${CORE_WASM}: ${CORE_DIST}
${CORE_ASYNCIFY_WASM}: ${CORE_DIST}
else
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
endif

build_core: ${CORE_WASM} ${TEST_CORE_WASM} ${CORE_ASYNCIFY_WASM} ${TEST_CORE_ASYNCIFY_WASM}
build_core_json_schemas:
	cd core/json_schemas && cargo run -- --dir=.

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
build_hosts: build_host_javascript build_host_python
clean_hosts:
	rm -rf ${HOST_JAVASCRIPT_ASSETS}
	cd host/javascript && yarn clean
	rm -rf ${HOST_PYTHON_ASSETS}

# copy wasm always because cached docker artifacts can have older timestamp
build_host_javascript: ${CORE_ASYNCIFY_WASM}
	mkdir -p ${HOST_JAVASCRIPT_ASSETS}
	cp ${CORE_ASYNCIFY_WASM} ${HOST_JAVASCRIPT_ASSETS}/core-async.wasm
	cd host/javascript && yarn install && yarn build	

test_host_javascript: build_host_javascript ${TEST_CORE_ASYNCIFY_WASM}
	cp ${TEST_CORE_ASYNCIFY_WASM} ${HOST_JAVASCRIPT_ASSETS}/test-core-async.wasm
	cd host/javascript && yarn test

deps_host_python:
	cd host/python; test -d venv || python3 -m venv venv; source venv/bin/activate; \
	python3 -m pip install -e .

build_host_python: deps_host_python ${CORE_WASM}
	mkdir -p ${HOST_PYTHON_ASSETS}
	cp ${CORE_WASM} ${HOST_PYTHON_ASSETS}/core.wasm
	# TODO: build?

test_host_python: build_host_python ${TEST_CORE_WASM}
	cp ${TEST_CORE_WASM} ${HOST_PYTHON_ASSETS}/test-core.wasm
	cd host/python; source venv/bin/activate; \
	python3 -m unittest discover tests/
