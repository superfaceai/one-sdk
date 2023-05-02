import { WASI } from '@cloudflare/workers-wasi';

import { App, HandleMap, coreModule } from '@superfaceai/one-sdk-common';
import type { TextCoder, FileSystem, Timers, Network } from '@superfaceai/one-sdk-common';
import { WasiContext } from "@superfaceai/one-sdk-common/src/app";
import { SecurityValuesMap } from '@superfaceai/one-sdk-common';

class CfwTextCoder implements TextCoder {
  private encoder: TextEncoder = new TextEncoder();
  private decoder: TextDecoder = new TextDecoder();

  decodeUtf8(buffer: ArrayBufferLike): string {
    return this.decoder.decode(buffer);
  }

  encodeUtf8(string: string): ArrayBuffer {
    return this.encoder.encode(string);
  }
}
class CfwFileSystem implements FileSystem {
  private readonly preopens: Record<string, Uint8Array>;
  private readonly files: HandleMap<{ data: Uint8Array, cursor: number }>;

  constructor(preopens: Record<string, Uint8Array>) {
    this.preopens = preopens;
    this.files = new HandleMap();
  }

  async open(path: string, options: { createNew?: boolean, create?: boolean, truncate?: boolean, append?: boolean, write?: boolean, read?: boolean }): Promise<number> {
    if (options.read !== true) {
      throw new Error('operation not supported - TODO: wasi error');
    }

    const data = this.preopens[path];
    if (data === undefined) {
      throw new Error('File does not exist');
    }
    
    return this.files.insert({ data, cursor: 0 });
  }
  async read(handle: number, out: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new Error('invalid file handle - TODO: wasi error');
    }

    const readCount = Math.min(out.byteLength, file.data.byteLength - file.cursor);
    const data = file.data.subarray(file.cursor, file.cursor + readCount);
    for (let i = 0; i < readCount; i += 1) {
      out[i] = data[i];
    }
    file.cursor += readCount;

    return readCount;
  }
  async write(handle: number, data: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new Error('invalid file handle - TODO: wasi error');
    }
    
    throw new Error('operation not supported - TODO: wasi error');
  }
  async close(handle: number): Promise<void> {
    const file = this.files.remove(handle);
    if (file === undefined) {
      throw new Error('File does not exist');
    }
  }
}
class CfwTimers implements Timers {
  public setTimeout(callback: () => void, ms: number): number {
    return setTimeout(callback, ms) as unknown as number;
  }

  public clearTimeout(handle: number): void {
    clearTimeout(handle);
  }
}
class CfwNetwork implements Network {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return fetch(input, init);
  }
}

class CfwWasiCompat implements WasiContext {
  private readonly wasi: WASI;
  private memory: WebAssembly.Memory | undefined;
  private readonly coder: CfwTextCoder;

  constructor(wasi: WASI) {
    this.wasi = wasi;
    this.coder = new CfwTextCoder();
  }

  get wasiImport(): WebAssembly.ModuleImports {
    return { ...this.wasi.wasiImport, fd_write: this.fd_write.bind(this) };
  }

  public initialize(instance: WebAssembly.Instance) {
    // TODO: WASI here is missing `initialize` method, but we need wasi.start to be called to initialize its internal state
    // so we have to hack a noop _start function here into exports
    this.wasi.start({
      exports: {
        ...instance.exports,
        _start() { }
      }
    });

    this.memory = instance.exports.memory as WebAssembly.Memory;
  }

  // copied from @cloudflare/workers-wasi
  private iovViews(
    view: DataView,
    iovs_ptr: number,
    iovs_len: number
  ): Array<Uint8Array> {
    let result = Array<Uint8Array>(iovs_len)
  
    for (let i = 0; i < iovs_len; i++) {
      const bufferPtr = view.getUint32(iovs_ptr, true)
      iovs_ptr += 4
  
      const bufferLen = view.getUint32(iovs_ptr, true)
      iovs_ptr += 4
  
      result[i] = new Uint8Array(view.buffer, bufferPtr, bufferLen)
    }
    return result
  }

  private fd_write(
    fd: number,
    ciovs_ptr: number,
    ciovs_len: number,
    retptr0: number
  ): Promise<number> | number {
    // hijack stdout yolo
    if (fd !== 1) {
      return this.wasi.wasiImport.fd_write(fd, ciovs_ptr, ciovs_len, retptr0);
    }

    const view = new DataView(this.memory!.buffer);
    const iovs = this.iovViews(view, ciovs_ptr, ciovs_len);
    const writeCount = iovs.reduce((acc, curr) => acc + curr.byteLength, 0);
    const buffer = new Uint8Array(writeCount);
    let cursor = 0;
    for (const iov of iovs) {
      for (let i = 0; i < iov.byteLength; i += 1) {
        buffer[cursor + i] = iov[i];
      }
      cursor += iov.byteLength;
    }
    view.setUint32(retptr0, writeCount, true);

    console.log(this.coder.decodeUtf8(buffer).trimEnd());

    return 0;
  }
}

export type ClientOptions = {
  env?: Record<string, string>;
  preopens?: Record<string, Uint8Array>;
};

export type ClientPerformOptions = {
  provider: string;
  parameters?: Record<string, string>;
  security?: SecurityValuesMap;
};

class InternalClient {
  private readonly wasi: WASI;
  private readonly app: App;
  private ready = false;

  constructor(readonly options: ClientOptions = {}) {
    const wasi = new WASI({
      env: options.env
    });

    this.wasi = wasi;
    this.app = new App(new CfwWasiCompat(wasi), {
      fileSystem: new CfwFileSystem(options.preopens ?? {}),
      textCoder: new CfwTextCoder(),
      timers: new CfwTimers(),
      network: new CfwNetwork()
    }, { metricsTimeout: 0 });
  }

  public destroy() {
    void this.teardown();
  }

  private async setup() {
    if (this.ready) {
      return;
    }

    await this.app.loadCoreModule(coreModule);
    await this.app.setup();

    this.ready = true;
  }

  private async teardown() {
    await this.app.teardown();
    this.ready = false;
  }

  public async perform(
    profile: string,
    provider: string,
    usecase: string,
    input?: unknown,
    parameters: Record<string, string> = {},
    security: SecurityValuesMap = {}
  ): Promise<any> {
    await this.setup();

    const resolvedProfile = profile.replace(/\//g, '.'); // TODO: be smarter about this

    return await this.app.perform(
      `file://grid/${resolvedProfile}.supr`,
      `file://grid/${provider}.provider.json`,
      `file://grid/${resolvedProfile}.${provider}.suma.js`,
      usecase,
      input,
      parameters,
      security
    );
  }
}

export class Client {
  private internal: InternalClient;

  constructor(readonly options: ClientOptions = {}) {
    this.internal = new InternalClient(options);
  }

  public destroy() {
    this.internal.destroy();
  }

  public async getProfile(name: string): Promise<Profile> {
    return await Profile.loadLocal(this.internal, name);
  }
}

export class Profile {
  private constructor(private readonly internal: InternalClient, public readonly name: string, public readonly url: string) {
  }

  public static async loadLocal(internal: InternalClient, name: string): Promise<Profile> {
    return new Profile(internal, name, ''); // TODO: why do we need the url here?
  }

  public getUseCase(usecaseName: string): UseCase {
    return new UseCase(this.internal, this, usecaseName);
  }
}

export class UseCase {
  constructor(private readonly internal: InternalClient, private readonly profile: Profile, public readonly name: string) {
  }

  public async perform<TInput = unknown, TResult = unknown>(input: TInput | undefined, options: ClientPerformOptions): Promise<TResult> {
    return await this.internal.perform(this.profile.name, options.provider, this.name, input, options?.parameters, options?.security) as TResult;
  }
}
