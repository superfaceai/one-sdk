import { Asyncify } from './asyncify.js';
import { HandleMap } from './handle_map.js';

import { PerformError, UnexpectedError, UninitializedError, WasiErrno, WasiError } from './error.js';
import { AppContext, FileSystem, Network, TextCoder, Timers, WasiContext, Persistence } from './interfaces.js';
import { SecurityValuesMap } from './security.js';
import * as sf_host from './sf_host.js';

class ReadableStreamAdapter implements Stream {
  private chunks: Uint8Array[];
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
    this.chunks = [];
  }
  async read(out: Uint8Array): Promise<number> {
    if (this.chunks.length === 0) {
      const readResult = await this.reader.read();
      if (readResult.value === undefined) {
        return 0;
      }

      this.chunks.push(readResult.value);
    }

    // TODO: coalesce multiple smaller chunks into one read
    let chunk = this.chunks.shift()!;
    if (chunk.byteLength > out.byteLength) {
      const remaining = chunk.subarray(out.byteLength);
      chunk = chunk.subarray(0, out.byteLength);

      this.chunks.unshift(remaining);
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

  public async withLock<R>(fn: (value: T) => R): Promise<Awaited<R>> {
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

function headersToHeadersList(headers: Headers): [string, string][] {
  const result: [string, string][] = [];

  headers.forEach((value, name) => {
    result.push([name, value]);
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
  getMetricsFn: () => Promise<number>;
  clearMetricsFn: () => Promise<void>;
  getDeveloperDumpFn: () => Promise<number>;
};
export class App implements AppContext {
  private readonly textCoder: TextCoder;
  private readonly network: Network;
  private readonly fileSystem: FileSystem;
  private readonly timers: Timers;
  private readonly persistence: Persistence;

  private readonly streams: HandleMap<Stream>;
  private readonly requests: HandleMap<Promise<Response>>;

  private module: WebAssembly.Module | undefined = undefined;
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

  // TODO: should the timer be part of the host platform instead?
  private metricsState: {
    timeout: number; // in ms
    handle: number; // timeout handle
  };

  constructor(
    dependencies: { network: Network, fileSystem: FileSystem, textCoder: TextCoder, timers: Timers, persistence: Persistence },
    options: { metricsTimeout?: number }
  ) {
    this.textCoder = dependencies.textCoder;
    this.network = dependencies.network;
    this.fileSystem = dependencies.fileSystem;
    this.timers = dependencies.timers;
    this.persistence = dependencies.persistence;
    this.streams = new HandleMap();
    this.requests = new HandleMap();
    this.metricsState = {
      timeout: options.metricsTimeout ?? 1000,
      handle: 0
    };
  }

  public async loadCore(wasm: BufferSource) {
    this.module = await WebAssembly.compile(wasm);
  }

  public async loadCoreModule(module: WebAssembly.Module) {
    this.module = module;
  }

  private get memory(): WebAssembly.Memory {
    if (this.core === undefined) {
      throw new UninitializedError();
    }
    return this.core.unsafeValue.instance.exports.memory as WebAssembly.Memory;
  }

  public get memoryBytes(): Uint8Array {
    return new Uint8Array(this.memory.buffer);
  }

  public get memoryView(): DataView {
    return new DataView(this.memory.buffer);
  }

  public async init(wasi: WasiContext): Promise<void> {
    if (this.module === undefined) {
      throw new UnexpectedError('CoreNotLoaded', 'Call loadCore or loadCoreModule first.');
    }

    if (this.core === undefined) {
      const [instance, asyncify] = await Asyncify.instantiate(this.module, (asyncify) => this.importObject(wasi, asyncify));
      wasi.initialize(instance);

      this.core = new AsyncMutex({
        instance,
        asyncify,
        setupFn: this.wrapExport(asyncify.wrapExport(instance.exports['oneclient_core_setup'] as () => void)),
        teardownFn: this.wrapExport(asyncify.wrapExport(instance.exports['oneclient_core_teardown'] as () => void)),
        performFn: this.wrapExport(asyncify.wrapExport(instance.exports['oneclient_core_perform'] as () => void)),
        // if we fail during getting metrics, we want to skip dumping metrics but still attempt to create developer dump
        getMetricsFn: this.wrapExport(instance.exports['oneclient_core_get_metrics'] as () => number),
        clearMetricsFn: this.wrapExport(instance.exports['oneclient_core_clear_metrics'] as () => void), // this is not called when dumping metrics, so we can wrap it as normal
        // if we fail during getting developer dump, we want to skip recursing, so we don't attempt to dump anything
        getDeveloperDumpFn: this.wrapExport(instance.exports['oneclient_core_get_developer_dump'] as () => number)
      });

      return this.core.withLock(core => core.setupFn());
    }
  }

  public async destroy(): Promise<void> {
    if (this.core !== undefined) {
      await this.sendMetrics();
      return this.core.withLock(core => core.teardownFn());
      // TODO: should there be a this.core = undefined here?
    }
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

        const state = this.performState;
        this.performState = undefined;
        if (state.exception !== undefined) {
          throw state.exception;
        }

        if (state.error !== undefined) {
          throw state.error;
        }

        return state.result;
      }
    );
  }

  public async handleMessage(message: any): Promise<any> {
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
          const file_handle = await this.fileSystem.open(message.path, {
            createNew: message.create_new,
            create: message.create,
            truncate: message.truncate,
            append: message.append,
            write: message.write,
            read: message.read
          });
          const handle = this.streams.insert({
            read: this.fileSystem.read.bind(this.fileSystem, file_handle),
            write: this.fileSystem.write.bind(this.fileSystem, file_handle),
            close: this.fileSystem.close.bind(this.fileSystem, file_handle)
          });
          return { kind: 'ok', stream: handle };
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
          const request: Promise<Response> = this.network.fetch(message.url, requestInit);
          return { kind: 'ok', handle: this.requests.insert(request) };
        } catch (error: any) {
          return { kind: 'err', error_code: error.name, message: error.message };
        }
      }

      case 'http-call-head': {
        try {
          const response = await this.requests.remove(message.handle)!;
          const bodyStream = new ReadableStreamAdapter(response.body!); // TODO: handle when they are missing
          return { kind: 'ok', status: response.status, headers: headersToHeadersList(response.headers), body_stream: this.streams.insert(bodyStream) };
        } catch (error: any) {
          return { kind: 'err', error_code: error.name, message: error.message };
        }
      }

      default:
        return { 'kind': 'err', 'error': `Unknown message ${message['kind']}` }
    }
  }

  public async readStream(handle: number, out: Uint8Array): Promise<number> {
    const stream = this.streams.get(handle);
    if (stream === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    return stream.read(out);
  }

  public async writeStream(handle: number, data: Uint8Array): Promise<number> {
    const stream = this.streams.get(handle);
    if (stream === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    return stream.write(data);
  }

  public async closeStream(handle: number): Promise<void> {
    const stream = this.streams.remove(handle);
    if (stream === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    await stream.close();
  }

  private importObject(wasi: WasiContext, asyncify: Asyncify): WebAssembly.Imports {
    return {
      wasi_snapshot_preview1: wasi.wasiImport,
      ...sf_host.link(this, this.textCoder, asyncify)
    }
  }

  private wrapExport<A extends unknown[], R>(fn: (...arg: A) => R): (...arg: A) => Promise<Awaited<R>> {
    return async (...args: A): Promise<Awaited<R>> => {
      try {
        return await fn(...args);
      } catch (err: unknown) {
        let errName = 'UnexpectedError';
        let errMessage = `${err}`;
        if (err instanceof WebAssembly.RuntimeError) {
          errName = 'WebAssemblyRuntimeError';
          errMessage = err.message;
        }

        // in case we got here while already attempting to dump during an error, this condition prevents recursion
        if (this.core !== undefined) {
          const core = this.core.unsafeValue;
          // unsetting core, we can't ensure memory integrity
          this.core = undefined;

          try {
            await this.createDeveloperDump(core);
            await this.sendMetricsOnPanic(core);
          } catch (dumpErr: unknown) {
            throw new UnexpectedError(errName, `${dumpErr} during dumping because of ${errMessage}`);
          }
        }

        throw new UnexpectedError(errName, errMessage);
      }
    }
  }

  /**
   * Returns tracing events stored in possibly disjoint memory for which there are two fat pointer in memory at `arenaPointer`.
   * 
   * Use this to retrieve metrics and developer dump from the wasm core.
   */
  private getTracingEventsByArena(memory: WebAssembly.Memory, arenaPointer: number): string[] {
    const memoryView = new DataView(memory.buffer);
    const buffer1Ptr = memoryView.getInt32(arenaPointer, true);
    const buffer1Size = memoryView.getInt32(arenaPointer + 4, true);
    const buffer2Ptr = memoryView.getInt32(arenaPointer + 8, true);
    const buffer2Size = memoryView.getInt32(arenaPointer + 12, true);

    const memoryBytes = new Uint8Array(memory.buffer);
    let buffer: Uint8Array;
    if (buffer2Size === 0) {
      buffer = memoryBytes.subarray(buffer1Ptr, buffer1Ptr + buffer1Size);
    } else {
      // need to copy the memory to make it contiguous
      buffer = new Uint8Array(buffer1Size + buffer2Size);
      buffer.set(memoryBytes.subarray(buffer1Ptr, buffer1Ptr + buffer1Size), 0);
      buffer.set(memoryBytes.subarray(buffer2Ptr, buffer2Ptr + buffer2Size), buffer1Size);
    }

    // now we split by null bytes and parse as strings
    const events: string[] = [];
    while (buffer.length > 0) {
      // event length without the null byte
      const eventLength = buffer.findIndex(b => b === 0);
      events.push(this.textCoder.decodeUtf8(buffer.subarray(0, eventLength)));
      buffer = buffer.subarray(eventLength + 1);
    }

    return events;
  }

  private setSendMetricsTimeout() {
    if (this.metricsState.handle === 0) {
      this.metricsState.handle = this.timers.setTimeout(() => this.sendMetrics(), this.metricsState.timeout);
    }
  }
  public async sendMetrics(): Promise<void> {
    this.timers.clearTimeout(this.metricsState.handle);
    this.metricsState.handle = 0;

    if (this.core === undefined) {
      return;
    }

    const events = await this.core.withLock(async (core) => {
      const arenaPointer = await core.getMetricsFn();
      const events: string[] = this.getTracingEventsByArena(core.instance.exports.memory as WebAssembly.Memory, arenaPointer);

      // this needs to be called under the same lock as getMetrics so we don't accidentally clear metrics
      // which we didn't read yet
      await core.clearMetricsFn();

      return events;
    });

    if (events.length > 0) {
      return this.persistence.persistMetrics(events);
    }
  }

  /** The intended use is after the core has panicked. */
  private async sendMetricsOnPanic(core: AppCore) {
    const arenaPointer = await core.getMetricsFn();
    const events = this.getTracingEventsByArena(core.instance.exports.memory as WebAssembly.Memory, arenaPointer);

    if (events.length > 0) {
      return this.persistence.persistMetrics(events);
    }
  }
  /** The intended use is after the core has panicked. */
  private async createDeveloperDump(core: AppCore) {
    const arenaPointer = await core.getDeveloperDumpFn();
    const events = this.getTracingEventsByArena(core.instance.exports.memory as WebAssembly.Memory, arenaPointer);

    if (events.length > 0) {
      return this.persistence.persistDeveloperDump(events);
    }
  }
}
