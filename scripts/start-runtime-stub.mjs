#!/usr/bin/env node

import { createServer } from 'node:http';

const [runtimeName = 'sgp-runtime-stub', portArg = '3302'] = process.argv.slice(2);
const port = Number(portArg);

if (!Number.isInteger(port) || port < 1) {
  console.error(`[runtime-stub] invalid port: ${portArg}`);
  process.exit(1);
}

const startedAt = new Date().toISOString();

const server = createServer((request, response) => {
  const payload = {
    runtime: runtimeName,
    status: 'scaffolded',
    started_at: startedAt,
    method: request.method,
    path: request.url,
    note: 'Stub runtime for architecture split verification. Business contracts remain to be implemented.',
  };

  response.setHeader('content-type', 'application/json; charset=utf-8');

  if (request.url === '/health') {
    response.writeHead(200);
    response.end(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  response.writeHead(501);
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[runtime-stub] ${runtimeName} listening on http://127.0.0.1:${port}`);
});
