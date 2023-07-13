import { createServer } from 'http';
import { OneClient, PerformError, UnexpectedError } from '../../host/javascript/node/index.js';

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

const server = await startLocalhostServer();

const client = new OneClient({
  assetsPath: '../examples/comlinks/src',
  superfaceApiUrl: 'https://superface.dev',
  token: process.env.ONESDK_TOKEN
});
const profile = await client.getProfile('wasm-sdk/example');

try {
  const result = await profile
    .getUseCase('Example')
    .perform(
      {
        id: 1,
      },
      {
        provider: 'localhost',
        parameters: { PARAM: 'parameter_value' },
        security: { basic_auth: { username: 'username', password: 'password' } }
      }
    );

  console.log('RESULT:', result);
} catch (e) {
  if (e instanceof PerformError) {
    console.log('ERROR RESULT:', e.errorResult);
  } else if (e instanceof UnexpectedError) {
    console.error('ERROR:', e);
  } else {
    throw e;
  }
} finally {
  server.close();
}
