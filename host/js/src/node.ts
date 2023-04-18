import fs, { FileHandle } from 'fs/promises';
import { resolve } from 'path';
import { WASI } from 'wasi';

import { App } from './app';
import type { TextCoder, FileSystem, Timers, Network } from './app';
import { HandleMap } from './handle_map';

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
  vars?: Record<string, string>;
  secrets?: Record<string, string>;
};

export class Client {
  public assetsPath: string = process.cwd();

  private corePath: string;
  private wasi: WASI;
  private app: App;
  private ready = false;

  constructor(readonly options: ClientOptions = {}) {
    if (options.assetsPath !== undefined) {
      this.assetsPath = options.assetsPath;
    }

    // TODO properly load core
    this.corePath = `${__dirname}/../../../core/dist/core-async.wasm`;

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

  public async perform(usecase: string, input?: any, options?: ClientPerformOptions): Promise<any> {
    await this.setup();

    const profileUrl = this.resolveProfileUrl();
    const mapUrl = this.resolveMapUrl(usecase);

    // TODO resolve variables
    const vars = options?.vars ?? {};

    // TODO resolve secrets
    const secrets = options?.secrets ?? {};

    return await this.app.perform(profileUrl, mapUrl, usecase, input, vars, secrets);
  }

  private initProcessHooks() {
    process.on('beforeExit', async () => {
      await this.teardown();
    });
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

  private async teardown() {
    await this.app.teardown();
    this.ready = false;
  }

  private resolveProfileUrl(): string {
    const path = resolve(this.assetsPath, 'profile.supr');

    if (fs.stat(path) === undefined) {
      throw new Error('Profile file does not exist');
    }

    return `file://${path}`;
  }

  private resolveMapUrl(usecase: string): string {
    const path = resolve(this.assetsPath, `${usecase}.js`);

    if (fs.stat(path) === undefined) {
      throw new Error(`Map file does not exist, usecase: ${usecase}`);
    }

    return `file://${path}`;
  }
}
