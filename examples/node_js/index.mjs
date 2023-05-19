import { createServer } from 'http';
import { SuperfaceClient } from '../../host/js/node/index.js';

async function startLocalhostServer() {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      url: req.url,
      method: req.method,
      headers: req.headers,
    }));
  });

  await new Promise((resolve) => {
    server.listen(8000, resolve);
  });

  return server;
}

async function main() {
  const server = await startLocalhostServer();

  const client = new SuperfaceClient({ assetsPath: '../examples/maps/src' });
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

  console.log('RESULT:', result);
  server.close();
}

void main();
