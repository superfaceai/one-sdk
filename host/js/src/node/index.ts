import fs, { FileHandle } from 'fs/promises';
import { resolve } from 'path';
import { WASI } from 'wasi';

import { createRequire } from 'node:module';

import { App, HandleMap } from '../common/index.js';
import type { TextCoder, FileSystem, Timers, Network, SecurityValuesMap } from '../common/index.js';

const CORE_PATH = createRequire(import.meta.url).resolve('../assets/core-async.wasm');

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

    const fileHandle = await fs.open(path, flags);
    return this.files.insert(fileHandle);
  }
  async read(handle: number, out: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new Error('invalid file handle - TODO: wasi error');
    }

    const result = await file.read(out, 0, out.byteLength);
    return result.bytesRead;
  }
  async write(handle: number, data: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new Error('invalid file handle - TODO: wasi error');
    }

    const result = await file.write(data, 0, data.length);
    return result.bytesWritten;
  }
  async close(handle: number): Promise<void> {
    const file = this.files.remove(handle);
    if (file === undefined) {
      throw new Error('File does not exist');
    }

    await file.close();
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
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return fetch(input, init); // TODO: import from undici explicitly
  }
}

export type ClientOptions = {
  assetsPath?: string;
};

export type ClientPerformOptions = {
  provider: string; // TODO: is there a way to make it optional?
  parameters?: Record<string, string>;
  security?: SecurityValuesMap;
};

class InternalClient {
  public assetsPath: string = process.cwd();

  private corePath: string;
  private wasi: WASI;
  private app: App;
  private ready = false;

  constructor(readonly options: ClientOptions = {}) {
    if (options.assetsPath !== undefined) {
      this.assetsPath = options.assetsPath;
    }

    this.corePath = CORE_PATH;

    this.wasi = new WASI({
      env: process.env
    });

    this.app = new App(this.wasi, {
      network: new NodeNetwork(),
      fileSystem: new NodeFileSystem(),
      textCoder: new NodeTextCoder(),
      timers: new NodeTimers()
    }, { metricsTimeout: 1000 });

    this.initProcessHooks();
  }

  public destroy() {
    void this.teardown();
  }

  public async perform(
    profile: string,
    provider: string,
    usecase: string,
    input?: unknown,
    parameters: Record<string, string> = {},
    security: SecurityValuesMap = {}
  ): Promise<unknown> {
    await this.setup();

    const profileUrl = this.resolveProfileUrl(profile);
    const providerUrl = this.resolveProviderUrl(provider);
    const mapUrl = this.resolveMapUrl(profile, provider);

    return await this.app.perform(profileUrl, providerUrl, mapUrl, usecase, input, parameters, security);
  }

  private async setup() {
    if (this.ready) {
      return;
    }

    await this.app.loadCore(
      await fs.readFile(this.corePath)
    );
    await this.app.setup();

    this.ready = true;
  }

  public resolveProfileUrl(profile: string): string {
    const resolvedProfile = profile.replace(/\//g, '.'); // TODO: be smarter about this
    const path = resolve(this.assetsPath, `${resolvedProfile}.supr`);

    if (fs.stat(path) === undefined) {
      throw new Error(`Profile file does not exist, path: ${path}`);
    }

    return `file://${path}`;
  }

  public resolveMapUrl(profile: string, provider?: string): string {
    const resolvedProfile = profile.replace(/\//g, '.'); // TODO: be smarter about this
    const path = resolve(this.assetsPath, `${resolvedProfile}.${provider}.suma.js`);

    return `file://${path}`;
  }

  public resolveProviderUrl(provider: string): string {
    const path = resolve(this.assetsPath, `${provider}.provider.json`);

    if (fs.stat(path) === undefined) {
      throw new Error(`Provider file does not exist, path: ${path}`);
    }

    return `file://${path}`;
  }

  private initProcessHooks() {
    process.on('beforeExit', async () => {
      await this.teardown();
    });
  }

  private async teardown() {
    await this.app.teardown();
    this.ready = false;
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
    const profileUrl = internal.resolveProfileUrl(name);
    return new Profile(internal, name, profileUrl);
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
