export function corePathURL(): URL {
  return new URL('../../assets/core-async.wasm', import.meta.url); // path is relative to location where common is simlinked
}
