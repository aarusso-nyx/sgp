import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface WorkerReadinessProbe {
  readonly ready: boolean;
  readonly url: string | null;
  readonly port: number | null;
  close(): Promise<void>;
}

export interface WorkerReadinessProbeOptions {
  workerName: string;
  portEnv: string;
  defaultPort: number;
  env?: NodeJS.ProcessEnv | undefined;
  enabledInTests?: boolean | undefined;
  port?: number | undefined;
}

const READY_PATHS = new Set(['/ready', '/health/ready']);

export async function startWorkerReadinessProbe(
  options: WorkerReadinessProbeOptions,
): Promise<WorkerReadinessProbe> {
  const env = options.env ?? process.env;
  if (isDisabled(env) || (env.NODE_ENV === 'test' && !options.enabledInTests)) {
    return noopProbe();
  }

  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (!READY_PATHS.has(path)) {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'not_found' }));
      return;
    }

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        status: 'ready',
        worker: options.workerName,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  const port =
    options.port ?? positiveInteger(env[options.portEnv], options.defaultPort);
  await listen(server, port);
  const address = server.address() as AddressInfo;

  return {
    ready: true,
    url: `http://127.0.0.1:${address.port}/ready`,
    port: address.port,
    close: () => close(server),
  };
}

function isDisabled(env: NodeJS.ProcessEnv): boolean {
  return ['1', 'true', 'yes', 'on'].includes(
    (env.WORKER_READINESS_DISABLED ?? '').toLowerCase(),
  );
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function noopProbe(): WorkerReadinessProbe {
  return {
    ready: false,
    url: null,
    port: null,
    close: () => Promise.resolve(),
  };
}
