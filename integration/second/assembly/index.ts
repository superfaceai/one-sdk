import { abort, test_me, HttpHandle, http_get, http_read_response } from "./sf_core_unstable";

export function abort_std(message: usize, fileName: usize, line: u32, column: u32): void {
	abort();
}


function http_get_std(url: string, headers: Array<string>): HttpHandle {
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
  
  const url = `https://swapi.dev/api/people/${param}`;
  const http = http_get_std(url, ['accept', 'application/json', 'foo', 'bar', 'accept', 'application/xml']);
  const response = http_read_response_string_std(http);

  return response.length;
}
