import { jest } from '@jest/globals';

import { Server, createServer as httpCreateServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';

import { Client } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Client', () => {
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
      const client = new Client({ assetsPath: resolvePath(__dirname, '../../../../examples/maps/src') });

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
  });
});