// inspired by https://github.com/AssemblyScript/wasi-shim/blob/main/assembly/bindings/wasi_snapshot_preview1.ts

export declare function test_me(arg: i32): i32;

export type ptr<T> = usize;
export type HttpHandle = i32;

/**
* Initiate HTTP GET request to given utf8-encoded url.
*
* Returns an opaque handle used to read retrieve response information.
*/
export declare function http_get(url_buf: ptr<u8>, url_len: usize): HttpHandle;

/**
* Read up to `len` bytes from HTTP response `handle` to `buf`.
*
* Returns number of bytes read.
* TODO: error handling
*/
export declare function http_read_response(handle: HttpHandle, buf: ptr<u8>, len: usize): usize;
