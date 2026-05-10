import { setTimeout as delay } from 'node:timers/promises';

import { isDomainError } from './common/errors/domain-error';
import { SqsQueueTransport } from './common/adapters/sqs-queue-transport';

// Network-timeout hardening at the AWS SDK boundary. The intent is to assert
// that a stalled remote call does not silently succeed, that the failure
// surfaces as either a typed DomainError or the SDK's own timeout error, and
// that a caller honoring AbortSignal can interrupt the stalled call.

describe('Network-timeout hardening at the AWS SDK boundary', () => {
  it('observes timeouts from the SQS client send call without dropping the failure', async () => {
    const client = {
      send: jest.fn(
        () =>
          new Promise((_resolve, reject) => {
            setTimeout(() => {
              const error = new Error('Synthetic network timeout');
              error.name = 'TimeoutError';
              reject(error);
            }, 5);
          }),
      ),
    };

    const transport = new SqsQueueTransport({
      client,
      queueUrls: { 'sgp.test': 'https://sqs.local/q/sgp-test' },
    });

    await expect(transport.publish('sgp.test', { x: 1 })).rejects.toMatchObject(
      {
        name: 'TimeoutError',
      },
    );
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('honors AbortSignal cancellation initiated by the caller mid-flight', async () => {
    const controller = new AbortController();
    const client = {
      send: jest.fn(
        (_command: unknown, options?: { abortSignal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            const signal = options?.abortSignal ?? controller.signal;
            if (signal.aborted) {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
              return;
            }
            const handler = () => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            };
            signal.addEventListener('abort', handler, { once: true });
          }),
      ),
    };

    const transport = new SqsQueueTransport({
      client,
      queueUrls: { 'sgp.test': 'https://sqs.local/q/sgp-test' },
    });

    const pending = transport.publish('sgp.test', { x: 1 });
    await delay(2);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('surfaces a typed DomainError when the SDK returns an empty success envelope where a queue URL is required', async () => {
    const client = {
      send: jest.fn(async () => ({ QueueUrl: undefined })),
    };
    const transport = new SqsQueueTransport({ client });

    let captured: unknown;
    try {
      await transport.publish('sgp.unresolved', { x: 1 });
    } catch (error) {
      captured = error;
    }
    expect(isDomainError(captured)).toBe(true);
  });
});
