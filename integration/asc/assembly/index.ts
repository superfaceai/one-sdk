import { http_get_std, http_read_response_string_std } from "./sf_core_unstable";

export function sf_entry_asc_example(param: i32): i32 {
  const url = `https://swapi.dev/api/people/${param}`;
  const http = http_get_std(url, ['accept', 'application/json', 'foo', 'bar', 'accept', 'application/xml']);
  const response = http_read_response_string_std(http);

  return response.length;
}
