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

export function http_get_std(url: string, headers: Array<string>): HttpHandle {
  const url_utf8 = String.UTF8.encode(url);

  let headers_str = "";
  for (let i = 0; i < headers.length / 2; i += 1) {
    headers_str += `${headers[i * 2]}:${headers[i * 2 + 1]}\n`;
  }
  const headers_utf8 = String.UTF8.encode(headers_str);

  return http_get(
    changetype<usize>(url_utf8), url_utf8.byteLength,
    changetype<usize>(headers_utf8), headers_utf8.byteLength,
  );
}

export function http_read_response_string_std(handle: HttpHandle): string {
  const ALLOC_SIZE: usize = 1024;

  let buffer = heap.alloc(ALLOC_SIZE);
  let len: usize = 0;
  let capacity: usize = ALLOC_SIZE;

  while (true) {
    const read = http_read_response(handle, buffer + len, capacity - len);

    if (read === 0) {
      break;
    }

    len += read;
    if (len === capacity) {
      buffer = heap.realloc(buffer, capacity + ALLOC_SIZE);
      capacity += ALLOC_SIZE;
    }
  }

  const result = String.UTF8.decodeUnsafe(buffer, len);
  heap.free(buffer);

  return result;
}
