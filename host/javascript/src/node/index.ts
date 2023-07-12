import fs, { FileHandle } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve as resolvePath } from 'node:path';
import { WASI } from 'node:wasi';

import { AsyncMutex } from '../common/app.js';
import {
  App,
  FileSystem,
  HandleMap,
  Network,
  SecurityValuesMap,
  TextCoder,
  Timers,
  UnexpectedError,
  WasiErrno,
  WasiError,
  Persistence
} from '../common/index.js';
import { fetchErrorToHostError, systemErrorToWasiError } from './error.js';

export { PerformError, UnexpectedError } from '../common/index.js';

const CORE_PATH = process.env.CORE_PATH ?? createRequire(import.meta.url).resolve('../assets/core-async.wasm');
const ASSETS_FOLDER = 'superface';

class NodeTextCoder implements TextCoder {
  private encoder: TextEncoder = new TextEncoder();
  private decoder: TextDecoder = new TextDecoder();

  decodeUtf8(buffer: ArrayBufferLike): string {
    return this.decoder.decode(buffer);
  }

  encodeUtf8(string: string): ArrayBuffer {
    return this.encoder.encode(string);
  }
}

class NodeFileSystem implements FileSystem {
  private readonly files: HandleMap<FileHandle> = new HandleMap();

  async open(path: string, options: { createNew?: boolean, create?: boolean, truncate?: boolean, append?: boolean, write?: boolean, read?: boolean }): Promise<number> {
    let flags = '';

    if (options.createNew === true) {
      flags += 'x';
    } else if (options.create === true) {
      // TODO
    }

    if (options.truncate === true) {
      flags += 'w';
    } else if (options.append === true) {
      flags += 'a';
    } else if (options.write === true) {
      flags += '+';
    } else if (options.read === true) {
      flags += 'r';
    }

    try {
      const fileHandle = await fs.open(path, flags);
      return this.files.insert(fileHandle);
    } catch (err: unknown) {
      throw systemErrorToWasiError(err);
    }
  }
  async read(handle: number, out: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    try {
      const result = await file.read(out, 0, out.byteLength);
      return result.bytesRead;
    } catch (err: unknown) {
      throw systemErrorToWasiError(err);
    }
  }
  async write(handle: number, data: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    try {
      const result = await file.write(data, 0, data.length);
      return result.bytesWritten;
    } catch (err: unknown) {
      throw systemErrorToWasiError(err);
    }
  }
  async close(handle: number): Promise<void> {
    const file = this.files.remove(handle);
    if (file === undefined) {
      throw new WasiError(WasiErrno.ENOENT);
    }

    try {
      await file.close();
    } catch (err: unknown) {
      throw systemErrorToWasiError(err);
    }
  }
}

class NodeTimers implements Timers {
  public setTimeout(callback: () => void, ms: number): number {
    return setTimeout(callback, ms) as unknown as number;
  }

  public clearTimeout(handle: number): void {
    clearTimeout(handle);
  }
}

class NodeNetwork implements Network {
  // TODO: import from undici explicitly
  async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(input, init)
    } catch (err: unknown) {
      throw fetchErrorToHostError(err);
    }
  }
}

class NodePersistence implements Persistence {
  private readonly token: string | undefined;
  private readonly insightsUrl: string;

  constructor(
    token: string | undefined,
    superfaceApiUrl: string | undefined
  ) {
    this.token = token;
    if (superfaceApiUrl !== undefined) {
      this.insightsUrl = `${superfaceApiUrl}/insights/sdk_event`;
    } else {
      this.insightsUrl = 'https://superface.ai/insights/sdk_event';
    }
  }

  async persistMetrics(events: string[]): Promise<void> {
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };
    if (this.token !== undefined) {
      headers['authorization'] = `SUPERFACE-SDK-TOKEN ${this.token}`;
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
    const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    const fileName = `onesdk_devlog_dump_${timestamp}.txt`;

    // TOOD: where to create the dump?
    await fs.writeFile(fileName, events.join(''));
  }
}

export type ClientOptions = {
  /**
   * Path to folder with Comlink's assets.
   */
  assetsPath?: string;
  /**
   * Optionally authenticate Client to send metrics about integration to Superface.
   * 
   * Manage tokens and see insights here: https://superface.ai/insights
   */
  token?: string;
  /**
   * URL where the Superface API can be reached.
   */
  superfaceApiUrl?: string;
};

export type ClientPerformOptions = {
  provider: string; // TODO: is there a way to make it optional?
  parameters?: Record<string, string>;
  security?: SecurityValuesMap;
};

class InternalClient {
  public readonly assetsPath: string = resolvePath(process.cwd(), ASSETS_FOLDER);

  private corePath: string;
  private app: App;
  private readyState: AsyncMutex<{ ready: boolean }>;

  constructor(readonly options: ClientOptions = {}) {
    if (options.assetsPath !== undefined) {
      this.assetsPath = options.assetsPath;
    }

    this.corePath = CORE_PATH;

    this.readyState = new AsyncMutex({ ready: false });

    this.app = new App({
      network: new NodeNetwork(),
      fileSystem: new NodeFileSystem(),
      textCoder: new NodeTextCoder(),
      timers: new NodeTimers(),
      persistence: new NodePersistence(options.token, options.superfaceApiUrl)
    }, { metricsTimeout: 1000 });
  }

  public async init() {
    return this.readyState.withLock(async (readyState) => {
      if (readyState.ready === true) {
        return;
      }

      await this.app.loadCore(
        await fs.readFile(this.corePath)
      );
      await this.app.init(new WASI({ env: process.env, version: 'preview1' } as any)); // TODO: node typings do not include version https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/wasi.d.ts#L68-L110

      this.initProcessHooks();

      readyState.ready = true;
    });
  }

  public async destroy() {
    return this.readyState.withLock(async (readyState) => {
      if (readyState.ready === false) {
        return;
      }

      await this.app.destroy();
      readyState.ready = false;
    });
  }

  public async perform(
    profile: string,
    provider: string,
    usecase: string,
    input?: unknown,
    parameters: Record<string, string> = {},
    security: SecurityValuesMap = {}
  ): Promise<unknown> {
    await this.init();

    const profileUrl = await this.resolveProfileUrl(profile);
    const providerUrl = await this.resolveProviderUrl(provider);
    const mapUrl = await this.resolveMapUrl(profile, provider);

    try {
      return await this.app.perform(profileUrl, providerUrl, mapUrl, usecase, input, parameters, security);
    } catch (err: unknown) {
      if (err instanceof UnexpectedError && (err.name === 'WebAssemblyRuntimeError')) {
        await this.destroy();
        await this.init();
      }

      throw err;
    }
  }

  public async resolveProfileUrl(profile: string): Promise<string> {
    const resolvedProfile = profile.replace(/\//g, '.');
    const path = resolvePath(this.assetsPath, `${resolvedProfile}.profile`);

    return `file://${path}`;
  }

  public async resolveMapUrl(profile: string, provider?: string): Promise<string> {
    const resolvedProfile = profile.replace(/\//g, '.');
    const path = resolvePath(this.assetsPath, `${resolvedProfile}.${provider}.map.js`);

    return `file://${path}`;
  }

  public async resolveProviderUrl(provider: string): Promise<string> {
    const path = resolvePath(this.assetsPath, `${provider}.provider.json`);

    return `file://${path}`;
  }

  private initProcessHooks() {
    process.on('beforeExit', async () => {
      await this.destroy();
    });
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
    const profileUrl = await internal.resolveProfileUrl(name);
    return new Profile(internal, name, profileUrl);
  }

  public getUseCase(usecaseName: string): UseCase {
    return new UseCase(this.internal, this, usecaseName);
  }
}

export class UseCase {
  constructor(private readonly internal: InternalClient, private readonly profile: Profile, public readonly name: string) {
  }

  /**
   * @param {*} input 
   * @param {ClientPerformOptions} options 
   * @returns {*}
   * @throws {PerformError | UnexpectedError}
   */
  public async perform<TInput = unknown, TResult = unknown>(input: TInput | undefined, options: ClientPerformOptions): Promise<TResult> {
    return await this.internal.perform(this.profile.name, options.provider, this.name, input, options?.parameters, options?.security) as TResult;
  }
}
