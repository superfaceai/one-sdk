// create http mirror server

import { createServer } from 'http';

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    url: req.url,
    method: req.method,
    query: req.query,
    headers: req.headers,
    body: req.body,
  }));
});

httpServer.listen(8000, () => {
  console.log('Server running at http://localhost:8000');
});