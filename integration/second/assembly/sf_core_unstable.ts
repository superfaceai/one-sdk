export declare function test_me(arg: i32): i32;

// inspired by https://github.com/AssemblyScript/wasi-shim/blob/main/assembly/bindings/wasi_snapshot_preview1.ts
export type ptr<T> = usize;
export type HttpHandle = i32;

/**
* Initiate HTTP GET request to given utf8-encoded url.
*
* Returns an opaque handle used to read retrieve response information.
*/
export declare function http_get(url_ptr: ptr<u8>, url_len: usize, headers_ptr: ptr<u8>, headers_len: usize): HttpHandle;

/**
* Read response bytes from `handle` to `out`.
*
* Returns number of bytes read.
* TODO: error handling
*/
export declare function http_read_response(handle: HttpHandle, out_ptr: ptr<u8>, out_len: usize): usize;

export declare function abort(): void;
