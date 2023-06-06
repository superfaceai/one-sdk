import { WASI } from '@cloudflare/workers-wasi';

import { App, HandleMap } from '../common/index.js';
import type { TextCoder, FileSystem, Timers, Network, WasiContext, SecurityValuesMap } from '../common/index.js';

export { PerformError, UnexpectedError } from '../common/error.js';

// @ts-ignore
import coreModule from '../assets/core-async.wasm';
import { ErrorCode, HostError, WasiErrno, WasiError } from '../common/index.js';

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
      throw new WasiError(WasiErrno.EROFS);
    }

    const data = this.preopens[path];
    if (data === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    return this.files.insert({ data, cursor: 0 });
  }
  async read(handle: number, out: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new WasiError(WasiErrno.EBADF);
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
      throw new WasiError(WasiErrno.EBADF);
    }

    throw new WasiError(WasiErrno.EROFS);
  }
  async close(handle: number): Promise<void> {
    const file = this.files.remove(handle);
    if (file === undefined) {
      throw new WasiError(WasiErrno.EBADF);
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
  async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    let response;
    try {
      response = await fetch(input, init);
    } catch (err: unknown) {
      throw err; // TODO: are there any errors that we need to handle here?
    }

    if (response.status === 530) {
      // TODO: DNS error is 530 with a human-readable HTML body describing the error
      // this is not trivial to parse and map to our error codes
      throw new HostError(ErrorCode.NetworkError, await response.text().catch(_ => 'Unknown Cloudflare 530 error'));
    }

    return response;
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
  assetsPath?: string;
  token?: string;
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

  public async init() {
    if (this.ready) {
      return;
    }

    await this.app.loadCoreModule(coreModule);
    await this.app.init();

    this.ready = true;
  }

  public async destroy() {
    await this.app.destroy();
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
    await this.init();

    const resolvedProfile = profile.replace(/\//g, '.'); // TODO: be smarter about this
    const assetsPath = this.options.assetsPath ?? 'superface'; // TODO: path join? - not sure if we are going to stick with this VFS

    return await this.app.perform(
      `file://${assetsPath}/${resolvedProfile}.profile`,
      `file://${assetsPath}/${provider}.provider.json`,
      `file://${assetsPath}/${resolvedProfile}.${provider}.map.js`,
      usecase,
      input,
      parameters,
      security
    );
  }
}

export class OneClient {
  private internal: InternalClient;

  constructor(readonly options: ClientOptions = {}) {
    this.internal = new InternalClient(options);
  }

  public async init() {
    await this.internal.init();
  }

  public async destroy() {
    await this.internal.destroy();
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
