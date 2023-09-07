export function corePathURL(): URL {
  return new URL('../assets/core-async.wasm', import.meta.url);
}
