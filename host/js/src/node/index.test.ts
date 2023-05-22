import { jest } from '@jest/globals';

import { Server, createServer as httpCreateServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';

import { OneClient } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('OneClient', () => {
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
      const client = new OneClient({ assetsPath: resolvePath(__dirname, '../../../../examples/comlinks/src') });

      const profile = await client.getProfile('wasm-sdk/example');
      const result = await profile
        .getUseCase('Example')
        .perform<unknown, { url: string }>(
          { id: 1 },
          {
            provider: 'localhost',
            parameters: { PARAM: 'parameter_value' },
            security: { basic_auth: { username: 'username', password: 'password' } }
          }
        );

      expect(result.url).toContain('/api/1');
    });

    test('concurrent requests', async () => {
      const client = new SuperfaceClient({ assetsPath: resolvePath(__dirname, '../../../../examples/maps/src') });

      const profile = await client.getProfile('wasm-sdk/example');
      const options = {
        provider: 'localhost',
        parameters: { PARAM: 'parameter_value' },
        security: { basic_auth: { username: 'username', password: 'password' } }
      };

      const usecase = profile.getUseCase('Example');
      const results = await Promise.all([
        usecase.perform({ id: 1 }, options),
        usecase.perform({ id: 2 }, options),
        usecase.perform({ id: 3 }, options),
      ]);

      expect(results.filter(r => r.isOk()).length).toBe(3);
    });
  });
});