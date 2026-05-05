import { request } from 'node:http';

import { startWorkerReadinessProbe } from './worker-readiness-probe';

describe('worker readiness probe', () => {
  it('serves a JSON readiness response for worker entrypoints', async () => {
    const probe = await startWorkerReadinessProbe({
      workerName: 'sgp-integrations-worker',
      portEnv: 'INTEGRATIONS_WORKER_READY_PORT',
      defaultPort: 0,
      enabledInTests: true,
      port: 0,
    });

    try {
      const body = await get(`${probe.url}`);
      expect(JSON.parse(body)).toEqual(
        expect.objectContaining({
          status: 'ready',
          worker: 'sgp-integrations-worker',
        }),
      );
    } finally {
      await probe.close();
    }
  });
});

function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    request(url, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => resolve(body));
    })
      .on('error', reject)
      .end();
  });
}
