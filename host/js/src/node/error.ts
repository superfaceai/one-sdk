import { getSystemErrorMap } from 'util';

import { ErrorCode, HostError, WasiErrno, WasiError } from '../common/app.js';

function systemErrnoToWasiErrnoMap(): Record<number, WasiErrno> {
  const map = getSystemErrorMap();

  const result: Record<number, WasiErrno> = {};
  for (const [key, [code, description]] of map.entries()) {
    // codes start with E, so we strip that and try to get WasiErrno value from that
    if (code in WasiErrno) {
      result[key] = WasiErrno[code as any] as unknown as WasiErrno;
    }
  }

  return result;
}
const SYSTEM_ERRNO_TO_WASI_ERRNO: Record<number, WasiErrno> = systemErrnoToWasiErrnoMap()

// https://nodejs.org/api/errors.html#class-systemerror
export function systemErrorToWasiError(error: unknown): WasiError {
  if (typeof error !== 'object' || error === null || !('errno' in error)) {
    return new WasiError(WasiErrno.EINVAL);
  }
  
  return new WasiError(
    SYSTEM_ERRNO_TO_WASI_ERRNO[error.errno as number] ?? WasiErrno.EINVAL
  );
}

export function fetchErrorToHostError(error: unknown): HostError {
  if (error instanceof Error) {
    let cause = '';
    for (const [key, value] of Object.entries(error.cause ?? {})) {
      cause += `${key}: ${value}\n`;
    }

    return new HostError(ErrorCode.NetworkError, `${error.name} ${error.message}${cause === '' ? '' : `\n${cause}`}`);
  }

  return new HostError(ErrorCode.NetworkError, 'Unknown error');
}
