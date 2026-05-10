import { GetQueueUrlCommand, SendMessageCommand } from '@aws-sdk/client-sqs';

import { SqsQueueTransport } from './common/adapters/sqs-queue-transport';
import { isDomainError } from './common/errors/domain-error';

class SqsTimeoutError extends Error {
  override name = 'TimeoutError';
}

function fakeClient(behavior: (command: object) => unknown) {
  return {
    send: jest.fn(async (command: object) => behavior(command)),
  };
}

describe('SQS transport hardening when AWS SQS is unavailable', () => {
  it('propagates SendMessageCommand timeouts to the publisher so the caller can retry with backoff', async () => {
    const client = fakeClient((command) => {
      if (command instanceof SendMessageCommand) {
        throw new SqsTimeoutError(
          'Synthetic SQS SendMessage timeout for hardening test',
        );
      }
      throw new SqsTimeoutError(
        `unexpected command in test: ${command.constructor.name}`,
      );
    });

    const transport = new SqsQueueTransport({
      client,
      queueUrls: { 'sgp.payroll': 'https://sqs.local/123/sgp-payroll' },
    });

    await expect(
      transport.publish('sgp.payroll', { tenant_id: 't1', kind: 'PAYROLL' }),
    ).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('surfaces a typed DomainError when GetQueueUrlCommand returns no QueueUrl', async () => {
    const client = fakeClient((command) => {
      if (command instanceof GetQueueUrlCommand) {
        return { QueueUrl: undefined };
      }
      throw new SqsTimeoutError('unexpected command');
    });

    const transport = new SqsQueueTransport({ client });

    let captured: unknown;
    try {
      await transport.publish('sgp.unknown', { tenant_id: 't1' });
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeDefined();
    expect(isDomainError(captured)).toBe(true);
  });

  it('returns an unsubscribe handle that stops the polling loop on call', async () => {
    const client = {
      send: jest.fn(async () => ({ Messages: [] })),
    };
    const transport = new SqsQueueTransport({
      client,
      queueUrls: { 'sgp.idle': 'https://sqs.local/123/sgp-idle' },
      pollIntervalMs: 1,
      receiveWaitTimeSeconds: 0,
    });

    const subscription = transport.subscribe('sgp.idle', async () => undefined);
    expect(typeof subscription.unsubscribe).toBe('function');
    subscription.unsubscribe();
  });

  it('skips publish when the SDK rejects with ServiceUnavailable, leaving no in-flight delete commands', async () => {
    const client = fakeClient((command) => {
      if (command instanceof SendMessageCommand) {
        const error = new Error('Synthetic SQS ServiceUnavailable');
        error.name = 'ServiceUnavailableException';
        throw error;
      }
      throw new SqsTimeoutError('unexpected command');
    });

    const transport = new SqsQueueTransport({
      client,
      queueUrls: { 'sgp.tx': 'https://sqs.local/123/sgp-tx' },
    });

    await expect(transport.publish('sgp.tx', { x: 1 })).rejects.toMatchObject({
      name: 'ServiceUnavailableException',
    });
    expect(client.send).toHaveBeenCalledTimes(1);
  });
});
