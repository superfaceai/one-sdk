export abstract class BaseError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

export class PerformError extends BaseError {
  constructor(public readonly errorResult: unknown) {
    super(PerformError.name, JSON.stringify(errorResult)); // TODO: get reasonable error message
  }
}

export class UnexpectedError extends BaseError {
  constructor(name: string, message: string) {
    super(name, message);
  }
}

export class UninitializedError extends BaseError {
  constructor() {
    super('Uninitialized', "SuperfaceClient isn't initialized.");
  }
}

export class WasiError extends Error {
  constructor(public readonly errno: WasiErrno) {
    super(`WASI error: ${WasiErrno[errno]}`);
  }
}

export enum WasiErrno {
  SUCCESS = 0,
  E2BIG = 1,
  EACCES = 2,
  EADDRINUSE = 3,
  EADDRNOTAVAIL = 4,
  EAFNOSUPPORT = 5,
  EAGAIN = 6,
  EALREADY = 7,
  EBADF = 8,
  EBADMSG = 9,
  EBUSY = 10,
  ECANCELED = 11,
  ECHILD = 12,
  ECONNABORTED = 13,
  ECONNREFUSED = 14,
  ECONNRESET = 15,
  EDEADLK = 16,
  EDESTADDRREQ = 17,
  EDOM = 18,
  EDQUOT = 19,
  EEXIST = 20,
  EFAULT = 21,
  EFBIG = 22,
  EHOSTUNREACH = 23,
  EIDRM = 24,
  EILSEQ = 25,
  EINPROGRESS = 26,
  EINTR = 27,
  EINVAL = 28,
  EIO = 29,
  EISCONN = 30,
  EISDIR = 31,
  ELOOP = 32,
  EMFILE = 33,
  EMLINK = 34,
  EMSGSIZE = 35,
  EMULTIHOP = 36,
  ENAMETOOLONG = 37,
  ENETDOWN = 38,
  ENETRESET = 39,
  ENETUNREACH = 40,
  ENFILE = 41,
  ENOBUFS = 42,
  ENODEV = 43,
  ENOENT = 44,
  ENOEXEC = 45,
  ENOLCK = 46,
  ENOLINK = 47,
  ENOMEM = 48,
  ENOMSG = 49,
  ENOPROTOOPT = 50,
  ENOSPC = 51,
  ENOSYS = 52,
  ENOTCONN = 53,
  ENOTDIR = 54,
  ENOTEMPTY = 55,
  ENOTRECOVERABLE = 56,
  ENOTSOCK = 57,
  ENOTSUP = 58,
  ENOTTY = 59,
  ENXIO = 60,
  EOVERFLOW = 61,
  EOWNERDEAD = 62,
  EPERM = 63,
  EPIPE = 64,
  EPROTO = 65,
  EPROTONOSUPPORT = 66,
  EPROTOTYPE = 67,
  ERANGE = 68,
  EROFS = 69,
  ESPIPE = 70,
  ESRCH = 71,
  ESTALE = 72,
  ETIMEDOUT = 73,
  ETXTBSY = 74,
  EXDEV = 75,
  ENOTCAPABLE = 76,
}

export class HostError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = code;
  }
}

/// Core counterpart in core/host_to_core_std/src/unstable/mod.rs
export enum ErrorCode {
  NetworkError = 'network:error', // generic network error
  NetworkConnectionRefused = 'network:ECONNREFUSED',
  NetworkHostNotFound = 'network:ENOTFOUND',
  NetworkInvalidUrl = 'network:invalid_url'
}