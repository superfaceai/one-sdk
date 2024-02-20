import { WASI } from '@cloudflare/workers-wasi';

import { App, HandleMap, UnexpectedError } from './common/index.js';
// @ts-ignore
import coreModule from '../assets/core-async.wasm';
import type { FileSystem, Network, SecurityValuesMap, TextCoder, Timers, WasiContext } from './common/index.js';
import { ErrorCode, HostError, Persistence, WasiErrno, WasiError } from './common/index.js';

const pkg = require('../package.json');

export { PerformError, UnexpectedError } from './common/error.js';

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

  async exists(path: string): Promise<boolean> {
    return this.preopens[path] !== undefined;
  }

  async open(path: string, options: { createNew?: boolean, create?: boolean, truncate?: boolean, append?: boolean, write?: boolean, read?: boolean }): Promise<number> {
    if (options.read !== true) {
      throw new WasiError(WasiErrno.EROFS);
    }

    const data = this.preopens[path];
    if (data === undefined) {
      throw new WasiError(WasiErrno.ENOENT);
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
      if (typeof err === 'object' && err !== null && 'message' in err) {
        // found a `Error: Network connection lost` caused by `kj/async-io-unix.c++:186: disconnected` in the wild
        throw new HostError(ErrorCode.NetworkError, `${err.message}`);
      }
      throw err;
    }

    if (response.status === 530) {
      // TODO: DNS error is 530 with a human-readable HTML body describing the error
      // this is not trivial to parse and map to our error codes
      throw new HostError(ErrorCode.NetworkError, await response.text().catch(_ => 'Unknown Cloudflare 530 error'));
    }

    return response;
  }
}
class CfwTextStreamDecoder {
  private decoder: TextDecoder = new TextDecoder();
  private decoderBuffer: string = '';

  /** Decodes streaming data and splits it by newline. */
  decodeUtf8Lines(buffer: ArrayBufferLike): string[] {
    this.decoderBuffer += this.decoder.decode(buffer, { stream: true });

    return this.getLines();
  }

  flush(): string[] {
    this.decoderBuffer += this.decoder.decode();

    return this.getLines();
  }

  private getLines() {
    const lines = this.decoderBuffer.split('\n');
    if (lines.length > 1) {
      this.decoderBuffer = lines[lines.length - 1];
      return lines.slice(0, -1);
    }

    return [];
  }
}
class CfwWasiCompat implements WasiContext {
  private readonly wasi: WASI;
  private memory: WebAssembly.Memory | undefined;

  private readonly stdoutDecoder = new CfwTextStreamDecoder();
  private readonly stderrDecoder = new CfwTextStreamDecoder();

  constructor(wasi: WASI) {
    this.wasi = wasi;
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
    // hijack stdout and stderr
    if (fd !== 1 && fd !== 2) {
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

    if (fd === 1) {
      this.stdoutDecoder.decodeUtf8Lines(buffer).forEach(line => console.log(line));
    } else {
      this.stderrDecoder.decodeUtf8Lines(buffer).forEach(line => console.error(line));
    }

    return 0; // SUCCESS
  }
}
class CfwPersistence implements Persistence {
  private readonly token: string | undefined;
  private readonly insightsUrl: string;
  private readonly userAgent: string | undefined;

  constructor(
    token: string | undefined,
    superfaceApiUrl: string | undefined,
    userAgent: string | undefined
  ) {
    this.token = token;
    this.userAgent = userAgent;
    if (superfaceApiUrl !== undefined) {
      this.insightsUrl = `${superfaceApiUrl}/insights/sdk_event`;
    } else {
      this.insightsUrl = 'https://superface.ai/insights/sdk_event';
    }
  }

  // TODO: investigate other ways of persisting metrics:
  // 1. Tail Workers https://developers.cloudflare.com/workers/platform/tail-workers/
  // 2. Logpush https://developers.cloudflare.com/workers/platform/logpush
  async persistMetrics(events: string[]): Promise<void> {
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };
    if (this.token !== undefined) {
      headers['authorization'] = `SUPERFACE-SDK-TOKEN ${this.token}`;
    }
    if (this.userAgent !== undefined) {
      headers['user-agent'] = this.userAgent;
    }

    await fetch(
      `${this.insightsUrl}/batch`,
      {
        method: 'POST',
        body: '[' + events.join(',') + ']',
        headers
      }
    );
  }

  async persistDeveloperDump(events: string[]): Promise<void> {
    for (const event of events) {
      console.error(event.trim());
    }
  }
}

export type ClientOptions = {
  env?: Record<string, string>;
  assetsPath?: string;
  token?: string;
  superfaceApiUrl?: string;
  preopens?: Record<string, Uint8Array>;
};

export type ClientPerformOptions = {
  provider: string;
  parameters?: Record<string, string>;
  security?: SecurityValuesMap;
};

class InternalClient {
  private readonly app: App;
  private ready = false;
  private readonly fileSystem: CfwFileSystem;

  constructor(readonly options: ClientOptions = {}) {
    this.fileSystem = new CfwFileSystem(options.preopens ?? {});
    this.app = new App({
      fileSystem: this.fileSystem,
      textCoder: new CfwTextCoder(),
      timers: new CfwTimers(),
      network: new CfwNetwork(),
      persistence: new CfwPersistence(options.token, options.superfaceApiUrl, this.userAgent)
    }, { metricsTimeout: 0 });
  }

  public async init() {
    // TODO: probably will need a lock like node platform has at some point
    if (this.ready) {
      return;
    }

    console.log('INIT useragent', this.userAgent);

    await this.app.loadCoreModule(coreModule);
    const wasi = new WASI({
      env: {
        ONESDK_DEFAULT_USERAGENT: this.userAgent,
        ...this.options.env
      }
    });
    await this.app.init(new CfwWasiCompat(wasi));

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

    let profilePath = `${assetsPath}/${resolvedProfile}.profile.ts`;
    // migration from Comlink to TypeScript profiles
    const profilePathComlink = `${assetsPath}/${resolvedProfile}.profile`;
    if (
      !(await this.fileSystem.exists(profilePath))
      && (await this.fileSystem.exists(profilePathComlink))
    ) {
      profilePath = profilePathComlink;
    }
    profilePath = `file://${profilePath}`;

    try {
      return await this.app.perform(
        profilePath,
        `file://${assetsPath}/${provider}.provider.json`,
        `file://${assetsPath}/${resolvedProfile}.${provider}.map.js`,
        usecase,
        input,
        parameters,
        security
      );
    } catch (err: unknown) {
      if (err instanceof UnexpectedError && (err.name === 'WebAssemblyRuntimeError')) {
        await this.destroy();
      }

      throw err;
    }
  }

  public async sendMetrics(): Promise<void> {
    return this.app.sendMetrics();
  }

  private get userAgent(): string {
    return `one-sdk-cloudflare/${pkg.version}`;
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

  /** Send metrics to Superface.
   * 
   * If `token` was passed in `ClientOptions` then the metrics will be associated with that account and project.
  */
  public async sendMetricsToSuperface(): Promise<void> {
    return this.internal.sendMetrics();
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
