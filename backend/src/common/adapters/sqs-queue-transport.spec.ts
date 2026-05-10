import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

import { SqsQueueTransport } from './sqs-queue-transport';

type ClientSendMock = jest.Mock<Promise<unknown>, [unknown]>;

describe('SqsQueueTransport fault handling', () => {
  function commandName(command: unknown): string {
    return command?.constructor?.name ?? 'UnknownCommand';
  }

  function createTransport(send: ClientSendMock) {
    const transport = new SqsQueueTransport({
      client: { send } as never,
      queueUrls: {
        'topic.standard':
          'https://sqs.sa-east-1.amazonaws.com/111/topic-standard',
        'topic.fifo': 'https://sqs.sa-east-1.amazonaws.com/111/topic.fifo',
      },
      pollIntervalMs: 1,
      receiveWaitTimeSeconds: 0,
    });
    return transport as unknown as {
      publish<TMessage>(topic: string, message: TMessage): Promise<void>;
      pollOnce<TMessage>(
        topic: string,
        handler: (message: TMessage, topic: string) => Promise<void> | void,
      ): Promise<boolean>;
    };
  }

  it('surfaces SQS send failures to the caller without fabricating success', async () => {
    const send = jest.fn(async (command: unknown) => {
      expect(command).toBeInstanceOf(SendMessageCommand);
      throw new Error('simulated sqs send outage');
    }) as ClientSendMock;
    const transport = createTransport(send);

    await expect(
      transport.publish('topic.standard', {
        tenant_id: 'tenant-a',
        id: 'msg-1',
      }),
    ).rejects.toThrow('simulated sqs send outage');
  });

  it('adds FIFO group and deduplication fields when the queue URL is FIFO', async () => {
    const send = jest.fn(async (command: unknown) => {
      expect(command).toBeInstanceOf(SendMessageCommand);
      const input = (command as SendMessageCommand).input;
      expect(input.MessageGroupId).toBe('tenant-a');
      expect(input.MessageDeduplicationId).toMatch(/^[0-9a-f]{64}$/);
      return {};
    }) as ClientSendMock;
    const transport = createTransport(send);

    await transport.publish('topic.fifo', {
      tenant_id: 'tenant-a',
      id: 'msg-1',
    });
  });

  it('does not delete malformed or handler-failed messages so SQS can retry them', async () => {
    const send = jest.fn(async (command: unknown) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [
            { Body: '{not-json', ReceiptHandle: 'bad-json' },
            {
              Body: JSON.stringify({ id: 'handler-fails' }),
              ReceiptHandle: 'handler-fails',
            },
          ],
        };
      }
      throw new Error(`unexpected ${commandName(command)}`);
    }) as ClientSendMock;
    const transport = createTransport(send);

    await expect(
      transport.pollOnce('topic.standard', async () => {
        throw new Error('simulated handler failure');
      }),
    ).resolves.toBe(true);
    expect(send).not.toHaveBeenCalledWith(expect.any(DeleteMessageCommand));
  });

  it('deletes only successfully handled messages', async () => {
    const send = jest.fn(async (command: unknown) => {
      if (command instanceof ReceiveMessageCommand) {
        return {
          Messages: [
            { Body: JSON.stringify({ id: 'ok' }), ReceiptHandle: 'receipt-ok' },
          ],
        };
      }
      if (command instanceof DeleteMessageCommand) {
        expect(command.input.ReceiptHandle).toBe('receipt-ok');
        return {};
      }
      if (command instanceof GetQueueUrlCommand) {
        throw new Error('queue URL should be configured for this test');
      }
      throw new Error(`unexpected ${commandName(command)}`);
    }) as ClientSendMock;
    const transport = createTransport(send);
    const handler = jest.fn();

    await expect(transport.pollOnce('topic.standard', handler)).resolves.toBe(
      true,
    );
    expect(handler).toHaveBeenCalledWith({ id: 'ok' }, 'topic.standard');
    expect(
      send.mock.calls.some(
        ([command]) => command instanceof DeleteMessageCommand,
      ),
    ).toBe(true);
  });
});
