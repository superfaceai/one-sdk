# ABI

This documents contains a description of the binary interface between the host and the core as well as between the core and the map.

## Host to Core ABI

This description uses mostly Rust syntax with some TypeScript mixed in (string types, unions, Record). Interfaces may be exemplified by valid Rust function type as would appear in actual source code.

### Common

Common definitions should be stabilised as soon as possible.

```rust
/// Ptr type represents a pointer into the WASM memory. Its bit width is 32bit on wasm32 (64bit on wasm64).
/// Note that `T` doesn't matter to the ABI, but is here for clarity.
///
/// `Ptr` cannot be transferred in a `Result`.
type Ptr<T>
/// Size type represents a byte length of objects in memory. Its bit width is the same as `Ptr`.
///
/// `Size` can be transferred in a `Result` - this limits the size to maximum value of 2^31.
type Size
/// Opaque handle used to identify a resource. Its bit width is always 32bit.
///
/// It is up to the Host whether these handles are reused after being invalidated.
///
/// `Handle`can be transferred in a `Result`. On wasm64 there is no loss of precision.
type Handle

/// Reference to an array of `T`.
/// 
/// It is sent as two consecutive arguments - `Ptr<T>` and `Size`.
type Ref<T> = (Ptr<T>, Size)
/// Same as `Ref<T>` but explicitly marked as mutable for interface clarity.
type RefMut<T> = (Ptr<T>, Size);
/// Result type encoded in the ABI.
/// 
/// Shares bits with the payload, so both `T` and `E` are restricted to 31 bits (48 bits on wasm64).
type Result<T, E> = T | E

/// WASI errno. Its representation is the same as Size.
///
/// See <https://github.com/WebAssembly/WASI/blob/main/legacy/preview1/docs.md#-errno-variant>.
type WasiErrno = success | 2big | ...
/// Custom error code represented as a string.
type ErrorCode = 
	| "network:error"
	| "network:ECONNREFUSED"
	| "network:ENOTFOUND"
	| "network:invalid_url"
	| "network:invalid_handle"
```

### Messaging

Unstable.

```rust
/// Sends a UTF-8 JSON message to the host (in `msg` as bytes).
///
/// The host decodes it, decides on a response and tries to store that response in the memory pointed at by `out`.
/// If `out` is insufficient to store the response, the response is instead stored on the host the handle is written to `out_handle`.
///
/// In any case, the size of the **whole** response is returned.
fn message_exchange(msg: Ref<u8>, out: RefMut<u8>, out_handle: Ptr<Handle>) -> Size // interface
import sf_host_unstable::message_exchange(msg_ptr: i32, msg_len: i32, out_ptr: i32, out_len: i32, out_handle: i32) -> i32 // wasm32
import sf_host_unstable::message_exchange(msg_ptr: i64, msg_len: i64, out_ptr: i64, out_len: i64, out_handle: i64) -> i64 // wasm64

/// Attempts to retrieve a message previously stored on the host when a call
/// to `message_exchange` did not provide a sufficiently large `out` buffer.
///
/// On success the message is stored in `out` and `Ok(response_size)` is returned.
/// On failure (e.g. handle is invalid) `Err(errno)` is returned.
extern "C" fn message_exchange_retrieve(handle: Handle, out: RefMut<u8>) -> Result<Size, WasiErrno>
import sf_host_unstable::message_exchange_retrieve(handle: i32, out_ptr: i32, out_len: i32) -> i32
import sf_host_unstable::message_exchange_retrieve(handle: i32, out_ptr: i64, out_len: i64) -> i64
```

#### Messages

Supported messages are part of the ABI and have the same stability as `message_exchange`.

```ts
/// Opens a file at an arbitrary path.
///
/// Returns a stream which can be read and/or written depending on passed flags.
///
/// See <https://www.man7.org/linux/man-pages/man2/open.2.html>.
type Request = {
	"kind": "file-open",
	"path": string,
	"read": bool,
	"write": bool,
	"append": bool,
	"truncate": bool,
	"create": bool,
	"create_new": bool
}
type Response = {
	"kind": "ok",
	"stream": Handle
} | {
	"kind": "err",
	"errno": WasiErrno
}
```

```ts
/// Initiates an HTTP request given the method, url, headers and body.
///
/// Headers are not joined. Query parameters can be part of the URL.
///
/// Returns a handle which can be used to retrieve the response.
type Request = {
	"kind": "http-call",
	"method": string,
	"url": string,
	"headers": Record<string, string[]>,
	"body": u8[] | null // array of numbers where each number is in [0; 255]
}
type Response = {
	"kind": "ok",
	"handle": Handle
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
/// Retrieves the head of the HTTP call response.
///
/// Body is exposed as a stream. The Host does not explicitly read the body until the stream is read.
type Request = {
	"kind": "http-call-head",
	"handle": Handle
}
type Response = {
	"kind": "ok",
	"status": number,
	"headers": Record<string, string[]>, // keys are always lowercase
	"body_stream": Handle // raw response body, it is not parsed according to content-type but it is decoded according to content-encoding
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
/// Any kind of JSON value with custom types support.
type HostValue =
	| { "$HostValue::Stream": Handle }
	| null
	| boolean
	| number
	| string
	| HostValue[]
	| Record<String, HostValue>
```

```ts
/// Retrieves inputs to the invoked perform.
type Request = {
	"kind": "perform-input"
}
type Response = {
	"kind": "ok",
	"profile_url": string,
	"provider_url": string,
	"map_url": string, // if prefixed with `file://` it is treated as a local path
	"usecase": string,
	"map_input": HostValue,
	"map_parameters": HostValue,
	"map_security": HostValue
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
/// Sends the output of the invoked perform.
type Request = {
	"kind": "perform-output-result",
	"result": HostValue
}
type Response = {
	"kind": "ok"
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
/// Sends the output of the invoked perform.
type Request = {
	"kind": "perform-output-error",
	"error": HostValue
}
type Response = {
	"kind": "ok"
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
/// Sends the output of the invoked perform.
type Request = {
	"kind": "perform-output-exception",
	"exception": {
		name: string,
		message: string
	}
}
type Response = {
	"kind": "ok"
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

### Streams

Unstable.

```rust
/// Reads bytes from stream at `handle` into `out`.
///
/// Returns number of bytes read as `Ok(count)` or `Err(errno)` if an error occured. 
///
/// See POSIX equivalent <https://man7.org/linux/man-pages/man2/read.2.html>.
fn stream_read(handle: Handle, out: RefMut<u8>) -> Result<Size, WasiErrno>
import sf_host_unstable::stream_read(handle: i32, out_ptr: i32, out_len: i32) -> i32
import sf_host_unstable::stream_read(handle: i32, out_ptr: i64, out_len: i64) -> i64

/// Writes bytes from `data` to stream.
///
/// Returns number of bytes written as `Ok(count)` or `Err(errno)` if an error occured.
///
/// See POSIX equivalent <https://man7.org/linux/man-pages/man2/write.2.html>.
fn stream_write(handle: Handle, data: Ref<u8>) -> Result<Size, WasiErrno>
import sf_host_unstable::stream_write(handle: i32, data_ptr: i32, data_len: i32) -> i32
import sf_host_unstable::stream_write(handle: i32, data_ptr: i64, data_len: i64) -> i64

/// Closes stream.
///
/// Returns `Ok(())` or `Err(errno)` if an error occured (e.g. invalid handle).
///
/// See POSIX equivalent <https://man7.org/linux/man-pages/man2/close.2.html>.
fn stream_close(handle: Handle) -> Result<(), WasiErrno>
import sf_host_unstable::stream_close(handle: i32) -> i32
import sf_host_unstable::stream_close(handle: i32) -> i64
```

### Entry

Unstable.

```rust
/// Initializes persistent Core state and logging.
///
/// Must be called once before perform and teardown are called.
pub extern "C" fn oneclient_core_setup()

/// Deinitializes persistent Core state.
///
/// This might include flushing metrics or persisting data, so this function may invoke imports.
///
/// Perform must not be called afterwards.
pub extern "C" fn oneclient_core_teardown()

/// Runs a perform, as indicated by `perform-input` message response.
///
/// Can be called any number of times between setup and teardown. The core is not reentrant.
pub extern "C" fn oneclient_core_perform()

/// An array of two elements. Each element of this array is a `(Ptr, Size)` tuple pointing at one slice of a ring buffer.
/// 
/// To read the complete ring buffer the slices must be read and concatenated.
type RingBufferRawParts = [Ref<u8>; 2]

/// Retrieves metrics from the internal metrics ring buffer accumulated by `perform`s since last `oneclient_core_clear_metrics`.
/// 
/// Metrics are never dropped automatically and will accumulate indefinitely unless `oneclient_core_clear_metrics` is called.
pub extern "C" fn oneclient_core_get_metrics() -> Ptr<RingBufferRawParts>
export oneclient_core_get_metrics() -> i32
export oneclient_core_get_metrics() -> i64

/// Clears the internal metrics ring buffer.
pub extern "C" fn oneclient_core_clear_metrics()

/// Retrieves the developer log dump internal ring buffer.
/// 
/// This ring buffer has a limited size and will drop old log lines.
pub extern "C" fn oneclient_core_get_developer_dump() -> Ptr<RingBufferRawParts>
export oneclient_core_get_developer_dump() -> i32
export oneclient_core_get_developer_dump() -> i64
```

### Asyncify

Unstable.

```rust
/// Allocates `stack_size` (`Size`-aligned) bytes and stored them into asyncify data struct at `data`.
///
/// This function is to be called when initializing Asyncify context from the host. The host is in control of how much
/// stack space to allocate, while the core is in control of where to put it.
///
/// Data structure: See <https://github.com/WebAssembly/binaryen/blob/6371cf63687c3f638b599e086ca668c04a26cbbb/src/passes/Asyncify.cpp#L106-L113>.
pub extern "C" fn asyncify_alloc_stack(data: Ptr<Size>, stack_size: Size)
export asyncify_alloc_stack(data_ptr: i32, stack_size: i32)

/// Other Asyncify exports - these are generated by `wasm-opt --asyncify` pass and are here for completeness.
///
/// They are called by the host to control unwinding and rewinding.
export asyncify_start_rewind(data_address: i32)
export asyncify_stop_rewind()
export asyncify_start_unwind(data_address: i32)
export asyncify_stop_unwind()
export asyncify_get_state()
```

## Core to Map ABI

This description uses `TypeScript` syntax. All interface appear the same way in the source code.

### Common

```ts
type Handle = number // Same as Host to Core Handle - u32
type ErrorCode = 
	| "network:error"
	| "network:ECONNREFUSED"
	| "network:ENOTFOUND"
	| "network:invalid_handle"
	| "network:invalid_url"
	| "security:misssing_secret"
	| "security:invalid_configuration"
	| "outcome:unxpected"
	| "context:taken"
```

### Messaging

Unstable.

```ts
/// Sends a JSON encoded message to the core.
///
/// Returns a JSON encoded response.
function message_exchange(message: string): string
```

#### Messages

Supported messages are part of the ABI and have the same stability as `message_exchange`.

```ts
/// Initiates an HTTP request given the method, url, headers and body.
///
/// Neither headers nor query parameters are joined, they are sent multiple times.
/// The URL may also contain query parameters and they are joined with `query`.
///
/// Returns a handle which can be used to retrieve the response.
type Request = {
	"kind": "http-call",
	"method": string,
	"url": string,
	"headers": Record<string, string[]>,
	"query": Record<string, string[]>,
	"security": string | null,
	"body": u8[] | null // array of numbers where each number is in [0; 255]
}
type Response = {
	"kind": "ok",
	"handle": Handle
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
/// Retrieves the head of the HTTP call response.
///
/// Body is exposed as a stream. The Core does not explicitly read the body until the stream is read.
type Request = {
	"kind": "http-call-head",
	"handle": Handle
}
type Response = {
	"kind": "ok",
	"status": number,
	"headers": Record<string, string[]>,
	"body_stream": Handle
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
type MapValue =
	| null
	| boolean
	| number
	| string
	| MapValue[]
	| Record<string, MapValue>
```

```ts
/// Takes context values (e.g. input, parameters, services and security) for the currently executing action.
///
/// After being taken, these values cannot be retrieved again.
type Request = {
	"kind": "take-context",
}
type Response = {
	"kind": "ok",
	"input": MapValue
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
/// Sets output success for currently executing action.
type Request = {
	"kind": "set-output-success",
	"output": MapValue
}
type Response = {
	"kind": "ok",
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

```ts
/// Sets output failure for currently executing action.
type Request = {
	"kind": "set-output-failure",
	"output": MapValue
}
type Response = {
	"kind": "ok",
} | {
	"kind": "err",
	"error_code": ErrorCode,
	"message": string
}
```

### Streams

Unstable.

```ts
/// Reads up to `out.byteLength` bytes from stream at `handle` into `out`.
///
/// Returns number of bytes read or throws an Error.
function stream_read(handle: Handle, out: ArrayBuffer): number
/// Writes up to `data.byteLength`  bytes from `data` into stream at `handle`.
///
/// Returns number of bytes written or throws an Error.
function stream_write(handle: Handle, data: ArrayBuffer): number
/// Closes stream at `handle`.
///
/// On error throws an Error.
function stream_close(handle: Handle): void
```

### Coding

Unstable.

```ts
/// Decodes `bytes` as UTF8 string or throws an Error.
function bytes_to_utf8(bytes: ArrayBuffer): string
/// Encodes `utf8` as UTF8 bytes.
function utf8_to_bytes(utf8: string): ArrayBuffer
/// Encodes `bytes` into base64 string.
function bytes_to_base64(bytes: ArrayBuffer): string
/// Decodes `base64` string into bytes or throws an Error.
function base64_to_bytes(base64: string): ArrayBuffer
/// Encodes `value` as x-www-urlencoded string.
///
/// Multiple values for one key are not joined.
function record_to_urlencoded(value: Record<string, string[]>): string
```

### Env

Unstable.

```ts
/// Prints message to user log.
function print(message: string): void
/// Prints message to developer log.
function printDebug(...data: unknown[]): void
```
