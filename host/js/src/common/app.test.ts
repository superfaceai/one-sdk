import { jest } from '@jest/globals';

import { readFile } from 'fs/promises';
import { createRequire } from 'module';
import { WASI } from 'wasi';

import { App } from './app.js';
import { UnexpectedError } from './error.js';
import { FileSystem, Network, TextCoder, Timers } from './interfaces.js';


class TestNetwork implements Network {
  fetch(input: RequestInfo, init?: RequestInit | undefined): Promise<Response> {
    throw new Error('Fetch method not implemented.');
  }
}

class TestFileSystem implements FileSystem {
  async open(path: string, options: { createNew?: boolean | undefined; create?: boolean | undefined; truncate?: boolean | undefined; append?: boolean | undefined; write?: boolean | undefined; read?: boolean | undefined; }): Promise<number> {
    return 1;
  }
  async read(handle: number, out: Uint8Array): Promise<number> {
    return 0;
  }
  write(handle: number, data: Uint8Array): Promise<number> {
    throw new Error('Write method not implemented.');
  }
  async close(handle: number): Promise<void> {
    return;
  }
}

class TestCoder implements TextCoder {
  private encoder: TextEncoder = new TextEncoder();
  private decoder: TextDecoder = new TextDecoder();

  decodeUtf8(buffer: ArrayBufferLike): string {
    return this.decoder.decode(buffer);
  }

  encodeUtf8(string: string): ArrayBuffer {
    return this.encoder.encode(string);
  }
}

class TestTimers implements Timers {
  setTimeout(callback: () => void, ms: number): number {
    return 1;
  }
  clearTimeout(handle: number): void {
  }
}

async function createApp(env: Record<string, string>): Promise<[App, jest.SpiedFunction<(message: any) => Promise<any>>]> {
  const wasi = new WASI({ env: { ...process.env, ...env } });

  const app = new App(wasi, {
    network: new TestNetwork(),
    fileSystem: new TestFileSystem(),
    textCoder: new TestCoder(),
    timers: new TestTimers(),
  }, { metricsTimeout: 1000 });

  await app.loadCore(
    await readFile(createRequire(import.meta.url).resolve('../../assets/test-core-async.wasm'))
  );

  await app.init();

  const handleMessage = jest.spyOn(app, 'handleMessage');
  handleMessage.mockImplementation(async (message) => {
    switch (message.kind) {
      case 'perform-output-result':
        (app as any).performState.result = message.result;
        return {
          kind: 'ok'
        }
    }
  });

  return [app, handleMessage];
}

describe('App', () => {
  test('panicked core', async () => {
    const [app] = await createApp({ CORE_PERFORM: 'panic' });

    try {
      await app.perform(
        '',
        '',
        '',
        '',
        null,
        {},
        {},
      );

    } catch (e) {
      expect(e).toBeInstanceOf(UnexpectedError);
    } finally {
      await app.destroy();
    }
  });
});