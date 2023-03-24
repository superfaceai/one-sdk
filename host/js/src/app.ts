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
  setupFn: () => void;
  teardownFn: () => Promise<void>;
  performFn: () => Promise<void>;
};
export class App implements AppContext {
  private readonly wasi: WasiContext;
  private readonly textCoder: TextCoder;
  private readonly fileSystem: FileSystem;

  private readonly streams: HandleMap<Stream>;
  private readonly requests: HandleMap<Promise<Response>>;

  private core: AppCore | undefined = undefined;
  private performState: { mapName: string, mapUsecase: string, mapInput: unknown, mapParameters: unknown, mapSecurity: unknown, mapOutput?: unknown } | undefined = undefined;
  constructor(wasi: WasiContext, dependencies: { fileSystem: FileSystem, textCoder: TextCoder }) {
    this.wasi = wasi;
    this.textCoder = dependencies.textCoder;
    this.fileSystem = dependencies.fileSystem;
    this.streams = new HandleMap();
    this.requests = new HandleMap();
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

    this.core = {
      instance,
      asyncify,
      setupFn: instance.exports['superface_core_setup'] as () => void,
      teardownFn: asyncify.wrapExport(instance.exports['superface_core_teardown'] as () => void),
      performFn: asyncify.wrapExport(instance.exports['superface_core_perform'] as () => void)
    };
  }

  private get memory(): WebAssembly.Memory {
    return this.core!!.instance.exports.memory as WebAssembly.Memory;
  }

  get memoryBytes(): Uint8Array {
    return new Uint8Array(this.memory.buffer);
  }

  get memoryView(): DataView {
    return new DataView(this.memory.buffer);
  }

  async setup(): Promise<void> {
    this.core!!.setupFn();
  }

  async teardown(): Promise<void> {
    return await this.core!!.teardownFn();
  }

  async perform(
    mapName: string,
    mapUsecase: string,
    mapInput: unknown,
    mapParameters: unknown,
    mapSecurity: unknown
  ): Promise<unknown> {
    this.performState = { mapName, mapUsecase, mapInput, mapParameters, mapSecurity };
    await this.core!!.performFn();

    const output = this.performState.mapOutput;
    this.performState = undefined;

    return output;
  }

  async handleMessage(message: any): Promise<any> {
    console.log('host: message:', message);

    switch (message['kind']) {
      case 'perform-input':
        return {
          kind: 'ok',
          map_name: this.performState!!.mapName,
          map_usecase: this.performState!!.mapUsecase,
          map_input: this.performState!!.mapInput,
          map_parameters: this.performState!!.mapParameters,
          map_security: this.performState!!.mapSecurity,
        };
      
      case 'perform-output':
        this.performState!!.mapOutput = message.map_result;
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
        const request = fetch(message.url, {
          method: message.method,
          headers: message.headers,
          body: new Uint8Array(message.body)
        });

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