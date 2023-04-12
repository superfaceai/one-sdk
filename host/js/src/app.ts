import { HandleMap } from './handle_map';
import { Asyncify } from './asyncify';

import * as sf_host from './sf_host';

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
    // TODO: what?
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
  periodicFn: () => Promise<void>;
};
export class App implements AppContext {
  private readonly wasi: WasiContext;
  private readonly textCoder: TextCoder;
  private readonly fileSystem: FileSystem;
  private readonly timers: Timers;

  private readonly streams: HandleMap<Stream>;
  private readonly requests: HandleMap<Promise<Response>>;

  private core: AsyncMutex<AppCore> | undefined = undefined;
  private performState: {
    profileUrl: string,
    mapUrl: string,
    usecase: string,
    input: unknown,
    vars: Record<string, string>,
    secrets: Record<string, string>,
    output?: unknown
  } | undefined = undefined;

  private periodicState: {
    period: number; // in ms
    timeout: number; // timeout handle
  };

  constructor(
    wasi: WasiContext,
    dependencies: { fileSystem: FileSystem, textCoder: TextCoder, timers: Timers },
    options: { periodicPeriod?: number }
  ) {
    this.wasi = wasi;
    this.textCoder = dependencies.textCoder;
    this.fileSystem = dependencies.fileSystem;
    this.timers = dependencies.timers;
    this.streams = new HandleMap();
    this.requests = new HandleMap();

    this.periodicState = { period: options.periodicPeriod ?? 10000, timeout: 0 };
  }

  private importObject(asyncify: Asyncify): WebAssembly.Imports {
    return {
      wasi_snapshot_preview1: this.wasi.wasiImport,
      ...sf_host.link(this, this.textCoder, asyncify)
    }
  }

  async loadCore(wasm: BufferSource) {
    const module = await WebAssembly.compile(wasm);
    const [instance, asyncify] = await Asyncify.instantiate(module, (asyncify) => this.importObject(asyncify));

    this.wasi.initialize(instance);

    this.core = new AsyncMutex({
      instance,
      asyncify,
      setupFn: asyncify.wrapExport(instance.exports['superface_core_setup'] as () => void),
      teardownFn: asyncify.wrapExport(instance.exports['superface_core_teardown'] as () => void),
      performFn: asyncify.wrapExport(instance.exports['superface_core_perform'] as () => void),
      periodicFn: asyncify.wrapExport(instance.exports['superface_core_periodic'] as () => void)
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
    this.periodic(); // launch periodic task
  }

  public async teardown(): Promise<void> {
    this.timers.clearTimeout(this.periodicState.timeout);
    return this.core!.withLock(core => core.teardownFn());
  }

  public async perform(
    profileUrl: string,
    mapUrl: string,
    usecase: string,
    input: unknown,
    vars: Record<string, string>,
    secrets: Record<string, string>
  ): Promise<unknown> {
    return this.core!.withLock(
      async (core) => {
        this.performState = { profileUrl, mapUrl, usecase, input, vars, secrets };
        await core.performFn();

        const output = this.performState.output;
        this.performState = undefined;
        return output;
      }
    );
  }

  private async periodic(): Promise<void> {
    this.timers.clearTimeout(this.periodicState.timeout);

    await this.core!.withLock(core => core.periodicFn());

    this.periodicState.timeout = this.timers.setTimeout(() => { this.periodic() }, this.periodicState.period);
  }

  async handleMessage(message: any): Promise<any> {
    console.log('host: message:', message);

    switch (message['kind']) {
      case 'perform-input':
        return {
          kind: 'ok',
          profile_url: this.performState!!.profileUrl,
          map_url: this.performState!.mapUrl,
          usecase: this.performState!.usecase,
          map_input: this.performState!.input,
          map_vars: this.performState!.vars,
          map_secrets: this.performState!.secrets,
        };

      case 'perform-output':
        this.performState!.output = message.map_result;
        return { kind: 'ok' };

      case 'file-open': {
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
      }

      case 'http-call': {
        const requestInit: RequestInit = {
          method: message.method,
          headers: message.headers,
        };

        if (message.body !== undefined && message.body !== null) {
          requestInit.body = new Uint8Array(message.body);
        }

        const request = fetch(message.url, requestInit);

        return { kind: 'ok', handle: this.requests.insert(request) };
      }

      case 'http-call-head': {
        const response = await this.requests.remove(message.handle)!!;
        const bodyStream = new ReadableStreamAdapter(response.body!!); // TODO: handle when they are missing

        return { kind: 'ok', status: response.status, headers: headersToMultimap(response.headers), body_stream: this.streams.insert(bodyStream) };
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
}