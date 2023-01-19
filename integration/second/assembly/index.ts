import { test_me, HttpHandle, http_get, http_read_response } from "./sf_unstable";

function http_get_std(url: string): HttpHandle {
	const url_utf8 = String.UTF8.encode(url);
	return http_get(changetype<usize>(url_utf8), url_utf8.byteLength);
}

function http_read_response_string_std(handle: HttpHandle): string {
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

export function sf_entry(a: i32): i32 {
  const param = test_me(a + 1);
  
  const url = `https://example.com/${param}`;
  const http = http_get_std(url);
  const response = http_read_response_string_std(http);

  return response.length;
}
