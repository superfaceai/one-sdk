import { createServer } from 'http';
import { OneClient } from '../../packages/nodejs_host/dist/index.js';

function generateRandomObject(n, l = 100) {
  const obj = {};
  for (let i = 0; i < n; i++) {
    obj[generateRandomString(10)] = generateRandomString(l);
  }
  return obj;
};

function generateRandomString(n) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

async function startLocalhostServer() {
  const server = createServer((req, res) => {
    const obj = generateRandomObject(100, 1000);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  });

  await new Promise((resolve) => {
    server.listen(8000, resolve);
  });

  return server;
}

const server = await startLocalhostServer();

const client = new OneClient({
  assetsPath: './nodejs',
  superfaceApiUrl: false,
});
const profile = await client.getProfile('test');
let result = await profile
  .getUseCase('Test')
  .perform({}, { provider: 'localhost' });
console.log('RESULT:', result);

result = await profile
  .getUseCase('Test')
  .perform({}, { provider: 'localhost' }); ``
console.log('RESULT 2:', result);

server.close();