export function corePathURL(): URL {
  // relative to where common is symlinked
  // up three times gets us from dist/common/lib into the outer package
  return new URL('../../../assets/core-async.wasm', import.meta.url);
}
