import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

export function corePath(): string {
  return process.env.CORE_PATH ?? createRequire(import.meta.url).resolve('../assets/core-async.wasm');
}

export async function loadCoreFile(): Promise<Buffer> {
  return await readFile(corePath());
}
