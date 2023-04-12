import fs, { FileHandle } from 'fs/promises';
import { promisify } from 'util';
import { WASI } from 'wasi';

import { App } from './app';
import type { TextCoder, FileSystem, Timers } from './app';
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

async function main() {
  const wasi = new WASI({
    env: process.env
  });
  const app = new App(wasi, { fileSystem: new NodeFileSystem(), textCoder: new NodeTextCoder(), timers: new NodeTimers() }, {  periodicPeriod: 1000 });
  await app.loadCore(
    await fs.readFile(process.argv[2])
  );

  const profileUrl = process.argv[3];
  const mapUrl = process.argv[4];
  const usecase = process.argv[5];
  const mapInput = {
		'center': {
			'latitude': 51.477,
			'longitude': 0.0,
		},
		'radius': 100,
		'categories': ['CAFE']
	}
  const mapParameters = {
		'__provider': {
			'services': {
				'default': {
					'baseUrl': 'https://overpass-api.de'
				}
			},
			'defaultService': 'default'
		}
	}
  const mapSecurity = {}

  await app.setup();
  const result = await app.perform(profileUrl, mapUrl, usecase, mapInput, mapParameters, mapSecurity)
  console.log('host: result:', result)

  await promisify(setTimeout)(10000);

  await app.teardown();
}

main()
