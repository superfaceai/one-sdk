export function corePath(): string {
  return process.env.CORE_PATH ?? new URL('../assets/core-async.wasm', import.meta.url).pathname;
}
