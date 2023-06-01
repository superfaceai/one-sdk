import { HandleMap } from './handle_map.js';
import { Asyncify } from './asyncify.js';

import * as sf_host from './sf_host.js';
import { SecurityValuesMap } from './security.js';
import { PerformError, UnexpectedError } from './error.js';

export interface WasiContext {
  wasiImport: WebAssembly.ModuleImports;
  initialize(instance: object): void;
}
export interface TextCoder {
  decodeUtf8(buffer: ArrayBufferLike): string;
  encodeUtf8(string: string): ArrayBuffer;
}
export interface FileSystem {
  open(path: string, options: { createNew?: boolean, create?: boolean, truncate?: boolean, append?: boolean, write?: boolean, read?: boolean }): Promise<number>;
  /** Read bytes and write them to `out`. Returns number of bytes read. */
  read(handle: number, out: Uint8Array): Promise<number>;
  /** Write bytes from `data`. Returns number of bytes written. */
  write(handle: number, data: Uint8Array): Promise<number>;
  close(handle: number): Promise<void>;
}
export interface Network {
  fetch(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response>
}
export interface Timers {
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}
export interface AppContext {
  memoryBytes: Uint8Array;
  memoryView: DataView;

  handleMessage(message: any): Promise<any>;
  readStream(handle: number, out: Uint8Array): Promise<number>;
  writeStream(handle: number, data: Uint8Array): Promise<number>;
  closeStream(handle: number): Promise<void>;
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

class ReadableStreamAdapter implements Stream {
  private chunks: Uint8Array[];
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
    this.chunks = [];
  }

  async read(out: Uint8Array): Promise<number> {
    let chunk;
    if (this.chunks.length > 0) {
      chunk = this.chunks[0];
      if (chunk.byteLength > out.byteLength) {
        const remaining = chunk.subarray(out.byteLength);
        chunk = chunk.subarray(0, out.byteLength);
        this.chunks[0] = remaining;
      }

      // TODO: coalesce multiple smaller chunks into one
    } else {
      const readResult = await this.reader.read();
      if (readResult.value === undefined) {
        return 0;
      }

      chunk = readResult.value;
    }

    const count = Math.min(chunk.byteLength, out.byteLength);
    for (let i = 0; i < count; i += 1) {
      out[i] = chunk[i];
    }

    return count;
  }
  async write(data: Uint8Array): Promise<number> {
    throw new Error('not implemented');
  }
  async close(): Promise<void> {
    // TODO: what to do here?
  }
}

/** Async mutex allows us to synchronize multiple async tasks.
 * 
 * For example, if a perform is in-flight but is waiting for I/O the async task is suspended. If at the same time
 * the periodic timer fires, this could cause core to be invoked twice within the same asyncify context, causing undefined behavior.
 * 
 * We can avoid this by synchronizing over core.
 * 
 * Note that this is not thread safe (concurrent), but merely task safe (asynchronous).
 */
export class AsyncMutex<T> {
  /** Promise to be awaited to synchronize between tasks. */
  private condvar: Promise<void>;
  /** Indicator of whether the mutex is currently locked. */
  private isLocked: boolean;
  private value: T;

  constructor(value: T) {
    this.condvar = Promise.resolve();
    this.isLocked = false;
    this.value = value;
  }

  /**
   * Get the protected value without respecting the lock.
   * 
   * This is unsafe, but it is needed to get access to memory in sf_host imports.
   */
  get unsafeValue(): T {
    return this.value;
  }

  public async withLock<R>(fn: (value: T) => Promise<R>): Promise<R> {
    do {
      // Under the assumption that we do not have concurrency it can never happen that two tasks
      // pass over the condition of this loop and think they both have a lock - that would imply there exists task preemption in synchronous code.
      //
      // If there ever is threading or task preemption, we will need to use other means (atomics, spinlocks).
      await this.condvar;
    } while (this.isLocked);

    this.isLocked = true;
    let notify: () => void;
    this.condvar = new Promise((resolve) => { notify = resolve; });

    try {
      return await fn(this.value);
    } finally {
      this.isLocked = false;
      notify!();
    }
  }
}

function headersToMultimap(headers: Headers): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!(k in result)) {
      result[k] = [];
    }

    result[k].push(value);
  });

  return result;
}

type Stream = {
  /** Reads up to `out.length` bytes from the stream, returns number of bytes read or throws a `WasiError`. */
  read(out: Uint8Array): Promise<number>;
  /** Writes up to `data.length` bytes into the stream, returns number of bytes written or throws a `WasiError`. */
  write(data: Uint8Array): Promise<number>;
  /** Closes the stream, returns undefined or throws a `WasiError`. */
  close(): Promise<void>;
};
type AppCore = {

  instance: WebAssembly.Instance;
  asyncify: Asyncify;
  setupFn: () => Promise<void>;
  teardownFn: () => Promise<void>;
  performFn: () => Promise<void>;
  sendMetricsFn: () => Promise<void>;
};
export class App implements AppContext {
  private readonly wasi: WasiContext;
  private readonly textCoder: TextCoder;
  private readonly network: Network;
  private readonly fileSystem: FileSystem;
  private readonly timers: Timers;

  private readonly streams: HandleMap<Stream>;
  private readonly requests: HandleMap<Promise<Response>>;

  private core: AsyncMutex<AppCore> | undefined = undefined;
  private performState: {
    profileUrl: string,
    providerUrl: string,
    mapUrl: string,
    usecase: string,
    input: unknown,
    parameters: Record<string, string>,
    security: SecurityValuesMap,
    result?: unknown,
    error?: PerformError,
    exception?: UnexpectedError
  } | undefined = undefined;

  private metricsState: {
    timeout: number; // in ms
    handle: number; // timeout handle
  };

  constructor(
    wasi: WasiContext,
    dependencies: { network: Network, fileSystem: FileSystem, textCoder: TextCoder, timers: Timers },
    options: { metricsTimeout?: number }
  ) {
    this.wasi = wasi;
    this.textCoder = dependencies.textCoder;
    this.network = dependencies.network;
    this.fileSystem = dependencies.fileSystem;
    this.timers = dependencies.timers;
    this.streams = new HandleMap();
    this.requests = new HandleMap();
    this.metricsState = { timeout: options.metricsTimeout ?? 1000, handle: 0 };
  }

  private importObject(asyncify: Asyncify): WebAssembly.Imports {
    return {
      wasi_snapshot_preview1: this.wasi.wasiImport,
      ...sf_host.link(this, this.textCoder, asyncify)
    }
  }

  async loadCore(wasm: BufferSource) {
    const module = await WebAssembly.compile(wasm);
    await this.loadCoreModule(module);
  }

  wrapExport<A extends unknown[], R>(fn: (...arg: A) => R): (...arg: A) => Promise<R> {
    return async (...args: A) => {
      try {
        return await fn(...args);
      } catch (err: unknown) {
        if (err instanceof WebAssembly.RuntimeError) {
          throw new UnexpectedError('WebAssemblyRuntimeError', `${err.message}`,);
        }

        throw new UnexpectedError('UnexpectedError', `${err}`);
      }
    }
  }

  async loadCoreModule(module: WebAssembly.Module) {
    const [instance, asyncify] = await Asyncify.instantiate(module, (asyncify) => this.importObject(asyncify));

    this.wasi.initialize(instance);

    this.core = new AsyncMutex({
      instance,
      asyncify,
      setupFn: this.wrapExport<[], void>(asyncify.wrapExport(instance.exports['superface_core_setup'] as () => void)),
      teardownFn: this.wrapExport<[], void>(asyncify.wrapExport(instance.exports['superface_core_teardown'] as () => void)),
      performFn: this.wrapExport<[], void>(asyncify.wrapExport(instance.exports['superface_core_perform'] as () => void)),
      sendMetricsFn: this.wrapExport<[], void>(asyncify.wrapExport(instance.exports['superface_core_send_metrics'] as () => void))
    });
  }

  private get memory(): WebAssembly.Memory {
    return this.core!.unsafeValue.instance.exports.memory as WebAssembly.Memory;
  }

  get memoryBytes(): Uint8Array {
    return new Uint8Array(this.memory.buffer);
  }

  get memoryView(): DataView {
    return new DataView(this.memory.buffer);
  }

  public async setup(): Promise<void> {
    return this.core!.withLock(core => core.setupFn());
  }

  public async teardown(): Promise<void> {
    await this.sendMetrics();
    return this.core!.withLock(core => core.teardownFn());
  }

  /**
   * @throws {PerformError | UnexpectedError}
   */
  public async perform(
    profileUrl: string,
    providerUrl: string,
    mapUrl: string,
    usecase: string,
    input: unknown,
    parameters: Record<string, string>,
    security: SecurityValuesMap,
  ): Promise<unknown> {
    this.setSendMetricsTimeout();

    return this.core!.withLock(
      async (core) => {
        this.performState = { profileUrl, providerUrl, mapUrl, usecase, input, parameters, security };
        await core.performFn();

        if (this.performState.result !== undefined) {
          const result = this.performState.result;
          this.performState = undefined;

          return result;
        }

        if (this.performState.error !== undefined) {
          const err = this.performState.error;
          this.performState = undefined;

          throw err;
        }

        if (this.performState.exception !== undefined) {
          const exception = this.performState.exception;
          this.performState = undefined;

          throw exception;
        }

        throw new UnexpectedError('UnexpectedError', 'Unexpected perform state');
      }
    );
  }

  async handleMessage(message: any): Promise<any> {
    switch (message['kind']) {
      case 'perform-input':
        return {
          kind: 'ok',
          profile_url: this.performState!.profileUrl,
          provider_url: this.performState!.providerUrl,
          map_url: this.performState!.mapUrl,
          usecase: this.performState!.usecase,
          map_input: this.performState!.input,
          map_parameters: this.performState!.parameters,
          map_security: this.performState!.security,
        };

      case 'perform-output-result':
        this.performState!.result = message.result;
        return { kind: 'ok' };

      case 'perform-output-error':
        this.performState!.error = new PerformError(message.error);
        return { kind: 'ok' };

      case 'perform-output-exception':
        this.performState!.exception = new UnexpectedError(message.exception.error_code, message.exception.message);
        return { kind: 'ok' };

      case 'file-open': {
        try {
          const handle = await this.fileSystem.open(message.path, {
            createNew: message.create_new,
            create: message.create,
            truncate: message.truncate,
            append: message.append,
            write: message.write,
            read: message.read
          });
          const res = this.streams.insert({
            read: this.fileSystem.read.bind(this.fileSystem, handle),
            write: this.fileSystem.write.bind(this.fileSystem, handle),
            close: this.fileSystem.close.bind(this.fileSystem, handle)
          });
          return { kind: 'ok', stream: res };
        } catch (error: any) {
          return { kind: 'err', errno: error.errno };
        }
      }

      case 'http-call': {
        const requestInit: RequestInit = {
          method: message.method,
          headers: message.headers,
        };

        if (message.body !== undefined && message.body !== null) {
          requestInit.body = new Uint8Array(message.body);
        }

        try {
          const request = this.network.fetch(message.url, requestInit);
          return { kind: 'ok', handle: this.requests.insert(request) };
        } catch (error: any) {
          return { kind: 'err', error_code: error.name, message: error.message };
        }
      }

      case 'http-call-head': {
        try {
          const response = await this.requests.remove(message.handle)!;
          const bodyStream = new ReadableStreamAdapter(response.body!); // TODO: handle when they are missing
          return { kind: 'ok', status: response.status, headers: headersToMultimap(response.headers), body_stream: this.streams.insert(bodyStream) };
        } catch (error: any) {
          return { kind: 'err', error_code: error.name, message: error.message };
        }
      }

      default:
        return { 'kind': 'err', 'error': `Unknown message ${message['kind']}` }
    }
  }

  async readStream(handle: number, out: Uint8Array): Promise<number> {
    const stream = this.streams.get(handle);
    if (stream === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    return stream.read(out);
  }

  async writeStream(handle: number, data: Uint8Array): Promise<number> {
    const stream = this.streams.get(handle);
    if (stream === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    return stream.write(data);
  }

  async closeStream(handle: number): Promise<void> {
    const stream = this.streams.remove(handle);
    if (stream === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    await stream.close();
  }

  private async sendMetrics(): Promise<void> {
    this.timers.clearTimeout(this.metricsState.handle);
    this.metricsState.handle = 0;

    await this.core!.withLock(core => core.sendMetricsFn());
  }

  private setSendMetricsTimeout() {
    if (this.metricsState.handle === 0) {
      this.metricsState.handle = this.timers.setTimeout(() => this.sendMetrics(), this.metricsState.timeout);
    }
  }
}