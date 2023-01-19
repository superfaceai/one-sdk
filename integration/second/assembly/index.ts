import { test_me, http_get, http_read_response, HttpHandle } from "./sf_unstable";

function http_get_std(url: string): HttpHandle {
	const url_utf8 = String.UTF8.encode(url);
	return http_get(url_utf8 as unknown as number, url_utf8.byteLength);
}

export function sf_entry(a: i32): i32 {
  const url = "http://example.com";
  
  const http = http_get_std(url);
  
  // const response_buffer = heap.alloc(1024);

  return http;
}
