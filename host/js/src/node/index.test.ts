import { jest } from '@jest/globals';

import { Server, createServer as httpCreateServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';

import { SuperfaceClient } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('SuperfaceClient', () => {
  describe('Basic use', () => {
    let server: Server;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    beforeAll(async () => {
      server = httpCreateServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          url: req.url,
          method: req.method,
          headers: req.headers,
        }));
      });

      new Promise<void>((resolve) => {
        server.listen(8000, resolve);
      });
    });

    afterAll(() => {
      server.close();
    });

    test('works', async () => {
      const client = new SuperfaceClient({ assetsPath: resolvePath(__dirname, '../../../../examples/maps/src') });

      const profile = await client.getProfile('wasm-sdk/example');
      const result = await profile
        .getUseCase('Example')
        .perform(
          { id: 1 },
          {
            provider: 'localhost',
            parameters: { PARAM: 'parameter_value' },
            security: { basic_auth: { username: 'username', password: 'password' } }
          }
        );

      expect(result.isOk()).toBe(true);
    });

    test('concurrent requests', async () => {
      const client = new SuperfaceClient({ assetsPath: resolvePath(__dirname, '../../../../examples/maps/src') });

      const profile = await client.getProfile('wasm-sdk/example');
      const options = {
        provider: 'localhost',
        parameters: { PARAM: 'parameter_value' },
        security: { basic_auth: { username: 'username', password: 'password' } }
      };

      await profile.getUseCase('Example').perform({ id: 1 }, options); // issue: needed to warm up the core, otherwise WASI is tried to be setted up mulitple times

      const results = await Promise.all([
        profile.getUseCase('Example').perform({ id: 1 }, options),
        profile.getUseCase('Example').perform({ id: 2 }, options),
        profile.getUseCase('Example').perform({ id: 3 }, options),
      ]);

      console.log(results);

      expect(results.filter(r => r.isOk()).length).toBe(3);
    });
  });
});