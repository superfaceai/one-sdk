import { HandleMap } from './handle_map.js';
import { Asyncify } from './asyncify.js';

import * as sf_host from './sf_host.js';
import { SecurityValuesMap } from './security.js';

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
 */
class AsyncMutex<T> {
  private promise: Promise<void>;
  private resolve: () => void;
  private value: T;

  constructor(value: T) {
    this.promise = Promise.resolve();
    this.resolve = () => { };
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
    await this.promise;
    this.promise = new Promise((resolve) => { this.resolve = resolve; });

    const result = await fn(this.value);

    this.resolve();

    return result;
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
  read(out: Uint8Array): Promise<number>;
  write(data: Uint8Array): Promise<number>;
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
    output?: unknown
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

  async loadCoreModule(module: WebAssembly.Module) {
    const [instance, asyncify] = await Asyncify.instantiate(module, (asyncify) => this.importObject(asyncify));

    this.wasi.initialize(instance);

    this.core = new AsyncMutex({
      instance,
      asyncify,
      setupFn: asyncify.wrapExport(instance.exports['superface_core_setup'] as () => void),
      teardownFn: asyncify.wrapExport(instance.exports['superface_core_teardown'] as () => void),
      performFn: asyncify.wrapExport(instance.exports['superface_core_perform'] as () => void),
      sendMetricsFn: asyncify.wrapExport(instance.exports['superface_core_send_metrics'] as () => void)
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
    await this.core!.withLock(core => core.setupFn());
  }

  public async teardown(): Promise<void> {
    await this.sendMetrics();
    return this.core!.withLock(core => core.teardownFn());
  }

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

        const output = this.performState.output;
        this.performState = undefined;
        return output;
      }
    );
  }

  async handleMessage(message: any): Promise<any> {
    // console.log('host: message:', message);

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

      case 'perform-output':
        this.performState!.output = message.map_result;
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
          // TODO: map errors to ErrorCode
          return { kind: 'err', error_code: 'http:unknown', message: `${error.name}: ${error.message}` };
        }
      }

      case 'http-call-head': {
        const response = await this.requests.remove(message.handle)!;
        const bodyStream = new ReadableStreamAdapter(response.body!); // TODO: handle when they are missing

        try {
          return { kind: 'ok', status: response.status, headers: headersToMultimap(response.headers), body_stream: this.streams.insert(bodyStream) };
        } catch (err: any) {
          // TODO: map errors to ErrorCode
          return { kind: 'err', error_code: 'http:unknown', message: `${err.name}: ${err.message}` };
        }
      }

      default:
        return { 'kind': 'err', 'error': 'Unknown message' }
    }
  }

  async readStream(handle: number, out: Uint8Array): Promise<number> {
    const stream = this.streams.get(handle);
    if (stream === undefined) {
      throw new Error('TODO: wasi error');
    }

    return stream.read(out);
  }

  async writeStream(handle: number, data: Uint8Array): Promise<number> {
    const stream = this.streams.get(handle);
    if (stream === undefined) {
      throw new Error('TODO: wasi error');
    }

    return stream.write(data);
  }

  async closeStream(handle: number): Promise<void> {
    const stream = this.streams.remove(handle);
    if (stream === undefined) {
      throw new Error('TODO: wasi error');
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