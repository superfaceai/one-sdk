export function corePathURL(): URL {
  // relative to where common is symlinked
  // up two times gets us from dist/common into the outer package
  return new URL('../../assets/core-async.wasm', import.meta.url);
}
