import { WASI } from "@cloudflare/workers-wasi";

import { App, coreModule } from '@superfaceai/one-sdk-common';
import type { TextCoder, FileSystem, Timers, Network } from '@superfaceai/one-sdk-common';

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
  async open(path: string, options: { createNew?: boolean, create?: boolean, truncate?: boolean, append?: boolean, write?: boolean, read?: boolean }): Promise<number> {
    return 0;
  }
  async read(handle: number, out: Uint8Array): Promise<number> {
    return 0;
  }
  async write(handle: number, data: Uint8Array): Promise<number> {
    return 0;
  }
  async close(handle: number): Promise<void> {
    return;
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

export class Client {
  private wasi: WASI;
  private app: App;
  private ready = false;

  constructor() {
    const wasi = new WASI({
      env: {
        'variable': 'test'
      }
    });
    // TODO: WASI here is missing `initialize` method, but we need wasi.start to be called to initialize its internal state
    // so we have to hack a noop _start function here into exports
    const wasiShim = {
      get wasiImport() { return wasi.wasiImport; },
      initialize(instance: WebAssembly.Instance) {
        wasi.start({
          exports: {
            ...instance.exports,
            _start() { }
          }
        });
      }
    };
    this.wasi = wasi;
    this.app = new App(wasiShim, {
      fileSystem: new CfwFileSystem(),
      textCoder: new CfwTextCoder(),
      timers: new CfwTimers(),
      network: new CfwNetwork()
    }, { metricsTimeout: 0 });
  }

  private async setup() {
    if (this.ready) {
      return;
    }

    await this.app.loadCoreModule(coreModule);
    await this.app.setup();

    this.ready = true;
  }

  public async teardown() {
    await this.app.teardown();
    this.ready = false;
  }

  public async perform(usecase: string, input?: any): Promise<unknown> {
    await this.setup();

    return await this.app.perform(
      'data:;base64,bmFtZSA9ICJ3YXNtLXNkay9leGFtcGxlIgp2ZXJzaW9uID0gIjAuMS4wIgoKdXNlY2FzZSBFeGFtcGxlIHsKICBpbnB1dCB7CiAgICBpZCEKICB9CgogIHJlc3VsdCB7CiAgICBuYW1lIQogICAgdXJsIQogIH0KfQ==',
      'data:;base64,LyoqCiAqIE9wdGlvbmFsbHkgaW50ZWdyYXRpb24gY2FuIGRlZmluZSBtYW5pZmVzdCwgd2hpY2ggZGVjbGFyZXMgcmVxdWlyZW1lbnRzIGZvciBpbnRlZ3JhdGlvbi4KICogCiAqIE1hbmlmZXN0IGlzIGV4cG9ydGVkIGNvbnN0YW50IG5hbWVkIG1hbmlmZXN0LgogKiAKICogTWFuaWZlc3QgY2FuIGNvbnRhaW46CiAqIC0gdXJsczogYXJyYXkgb2YgdXJscywgd2hpY2ggYXJlIGFsbG93ZWQgdG8gYmUgdXNlZCBpbiBmZXRjaAogKiAtIHZhcnM6IGFycmF5IG9mIHZhcmlhYmxlcywgd2hpY2ggYXJlIHJlcXVpcmVkIHRvIGJlIHNldAogKiAtIHNlY3JldHM6IGFycmF5IG9mIHNlY3JldHMsIHdoaWNoIGFyZSByZXF1aXJlZCB0byBiZSBzZXQKICovCi8vIFRPRE86IHVuY29tbWVudCB3aGVuIG1hbmlmZXN0IGlzIHN1cHBvcnRlZAovLyBleHBvcnQgY29uc3QgbWFuaWZlc3QgPSB7Ci8vICAgdXJsczogWwovLyAgICAgJ2h0dHBzOi8vc3VwZXJmYWNlLmFpJywKLy8gICAgICdodHRwczovL3N1cGVyZmFjZS5kZXYnCi8vICAgXSwKLy8gICB2YXJzOiBbeyBuYW1lOiAnRk9PJywgZGVzY3JpcHRpb246ICcnIH0sIHsgbmFtZTogJ0JBUicsIGRlc2NyaXB0aW9uOiAnJyB9XSwKLy8gICBzZWNyZXRzOiBbeyBuYW1lOiAnVVNFUicsIGRlc2NyaXB0aW9uOiAnJyB9LCB7IG5hbWU6ICdQQVNTV09SRCcsIGRlc2NyaXB0aW9uOiAnJyB9XSwKLy8gfQoKLyoqCiAqIFRPRE8gcmVtb3ZlIF9zdGFydCBhbmQgdXNlIGRlZmF1bHQgZXhwb3J0ZWQgZnVuY3Rpb24KICovCmZ1bmN0aW9uIF9zdGFydCh1c2VjYXNlTmFtZSkgewogIF9fZmZpLnVuc3RhYmxlLnByaW50RGVidWcoCiAgICAnUnVubmluZyB1c2VjYXNlOicsCiAgICB1c2VjYXNlTmFtZQogICk7CgogIEV4YW1wbGVVc2VjYXNlSW1wbGVtZW50YXRpb24oKTsKfQoKLy8gVE9ETzogdW5jb21tZW50IHdoZW4gZXhwb3J0IGRlZmF1bHQgaXMgc3VwcG9ydGVkCi8vIGV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEV4YW1wbGVVc2VjYXNlSW1wbGVtZW50YXRpb24oKSB7CmZ1bmN0aW9uIEV4YW1wbGVVc2VjYXNlSW1wbGVtZW50YXRpb24oKSB7CiAgY29uc3QgeyBpbnB1dCwgdmFycyB9ID0gc3RkLnVuc3RhYmxlLnRha2VJbnB1dCgpOwoKICBfX2ZmaS51bnN0YWJsZS5wcmludERlYnVnKCdJbnB1dDonLCBpbnB1dCk7CiAgX19mZmkudW5zdGFibGUucHJpbnREZWJ1ZygnVmFyczonLCB2YXJzKTsKCiAgY29uc3QgdXJsID0gYGh0dHBzOi8vc3dhcGkuZGV2L2FwaS9wZW9wbGUvJHtpbnB1dC5pZH1gOwoKICBjb25zdCBvcHRpb25zID0gewogICAgbWV0aG9kOiAnR0VUJywKICAgIGhlYWRlcnM6IHsKICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJywKICAgIH0sCiAgICBzZWN1cml0eTogewogICAgICAidHlwZSI6ICJhcGlrZXkiLAogICAgICAiaW4iOiAiaGVhZGVyIiwKICAgICAgIm5hbWUiOiAieC1zZWNyZXQta2V5IiwKICAgICAgImFwaWtleSI6ICIkU0VDUkVUX05BTUUiCiAgICB9CiAgfTsKCiAgY29uc3QgcmVzcG9uc2UgPSBzdGQudW5zdGFibGUuZmV0Y2godXJsLCBvcHRpb25zKS5yZXNwb25zZSgpOwoKICBjb25zdCBib2R5ID0gcmVzcG9uc2UuYm9keUF1dG8oKSA/PyB7fTsKCiAgc3RkLnVuc3RhYmxlLnNldE91dHB1dFN1Y2Nlc3MoewogICAgbmFtZTogYm9keS5uYW1lLAogICAgaGVpZ2h0OiBib2R5LmhlaWdodCwKICAgIFZBUjogdmFycy5NWV9WQVIsCiAgfSk7Cn0=',
      usecase,
      input,
      { "MY_VAR": "variable_value" },
      { "SECRET_NAME": "supersecret", "USER": "superuser", "PASSWORD": "superpassword" }
    );
  }
}
