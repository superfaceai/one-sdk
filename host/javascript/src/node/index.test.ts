import { jest } from '@jest/globals';

import { Server, createServer as httpCreateServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';

import { OneClient } from './index.js';
import { UnexpectedError } from '../common/error.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientOptions = {
  assetsPath: resolvePath(__dirname, '../../../../examples/comlinks/src'),
  superfaceApiUrl: 'https://superface.dev'
};

describe('OneClient', () => {
  describe('Basic use', () => {
    let server: Server;

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

    test('basic use', async () => {
      const client = new OneClient(clientOptions);
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
      const client = new OneClient(clientOptions);
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

      expect(results.length).toBe(3);
    });

    test('destroy without setup', async () => {
      const client = new OneClient(clientOptions);
      await expect(client.destroy()).resolves.not.toThrow();
    });

    test('panicked core', async () => {
      const ORIGINAL_CORE_PATH = process.env.CORE_PATH;
      process.env.CORE_PATH = resolvePath(__dirname, '../../assets/test-core-async.wasm');

      const client = new OneClient(clientOptions);
      const profile = await client.getProfile('wasm-sdk/example');
      await expect(profile.getUseCase('CORE_PERFORM_PANIC').perform({}, { provider: 'localhost' })).rejects.toThrow(UnexpectedError);
      await expect(profile.getUseCase('CORE_PERFORM_TRUE').perform({}, { provider: 'localhost' })).resolves.toBe(true);

      process.env.CORE_PATH = ORIGINAL_CORE_PATH;
    });

    test('profile file does not exist', async () => {
      const client = new OneClient(clientOptions);
      const profile = await client.getProfile('wasm-sdk/does-not-exist');
      const usecase = profile.getUseCase('Example');
      await expect(
        () => usecase.perform({}, { provider: 'localhost' })
      ).rejects.toThrow(UnexpectedError)
    });
  });
});