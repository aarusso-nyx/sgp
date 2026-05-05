import { createHash } from 'node:crypto';

import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
  type SQSClientConfig,
} from '@aws-sdk/client-sqs';

import type {
  QueueAdapterTransport,
  QueueMessageHandler,
  QueueSubscription,
} from './queue-adapter';

type SqsClientLike = Pick<SQSClient, 'send'>;

export type SqsQueueTransportOptions = Readonly<{
  client?: SqsClientLike;
  clientConfig?: SQSClientConfig;
  queueUrls?: Readonly<Record<string, string>>;
  topicToQueueName?: (topic: string) => string;
  messageGroupId?: (topic: string, message: unknown) => string;
  pollIntervalMs?: number;
  receiveWaitTimeSeconds?: number;
  visibilityTimeoutSeconds?: number;
  maxMessages?: number;
}>;

type InternalSubscription = {
  closed: boolean;
};

export class SqsQueueTransport implements QueueAdapterTransport {
  private readonly client: SqsClientLike;
  private readonly queueUrls: Readonly<Record<string, string>>;
  private readonly topicToQueueName: (topic: string) => string;
  private readonly messageGroupId: (topic: string, message: unknown) => string;
  private readonly pollIntervalMs: number;
  private readonly receiveWaitTimeSeconds: number;
  private readonly visibilityTimeoutSeconds?: number;
  private readonly maxMessages: number;
  private readonly resolvedQueueUrls = new Map<string, string>();

  constructor(options: SqsQueueTransportOptions = {}) {
    this.client = options.client ?? new SQSClient(options.clientConfig ?? {});
    this.queueUrls = options.queueUrls ?? {};
    this.topicToQueueName = options.topicToQueueName ?? ((topic) => topic);
    this.messageGroupId =
      options.messageGroupId ??
      ((topic, message) => defaultMessageGroupId(topic, message));
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.receiveWaitTimeSeconds = options.receiveWaitTimeSeconds ?? 10;
    this.visibilityTimeoutSeconds = options.visibilityTimeoutSeconds;
    this.maxMessages = options.maxMessages ?? 10;
  }

  async publish<TMessage>(topic: string, message: TMessage): Promise<void> {
    const queueUrl = await this.queueUrl(topic);
    const body = JSON.stringify(message);
    const commandInput: ConstructorParameters<typeof SendMessageCommand>[0] = {
      QueueUrl: queueUrl,
      MessageBody: body,
    };

    if (isFifoQueue(queueUrl)) {
      commandInput.MessageGroupId = this.messageGroupId(topic, message);
      commandInput.MessageDeduplicationId = defaultDeduplicationId(body);
    }

    await this.client.send(new SendMessageCommand(commandInput));
  }

  subscribe<TMessage>(
    topic: string,
    handler: QueueMessageHandler<TMessage>,
    options: { concurrency?: number } = {},
  ): QueueSubscription {
    const subscription: InternalSubscription = { closed: false };
    const concurrency = Math.max(1, options.concurrency ?? 1);
    for (let index = 0; index < concurrency; index += 1) {
      void this.poll(topic, handler, subscription);
    }

    return {
      unsubscribe: () => {
        subscription.closed = true;
      },
    };
  }

  private async poll<TMessage>(
    topic: string,
    handler: QueueMessageHandler<TMessage>,
    subscription: InternalSubscription,
  ): Promise<void> {
    while (!subscription.closed) {
      const queueUrl = await this.queueUrl(topic);
      const response = await this.client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: this.maxMessages,
          WaitTimeSeconds: this.receiveWaitTimeSeconds,
          VisibilityTimeout: this.visibilityTimeoutSeconds,
        }),
      );
      for (const message of response.Messages ?? []) {
        if (!message.Body) continue;
        await handler(JSON.parse(message.Body) as TMessage, topic);
        if (message.ReceiptHandle) {
          await this.client.send(
            new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle,
            }),
          );
        }
      }

      if ((response.Messages ?? []).length === 0) {
        await delay(this.pollIntervalMs);
      }
    }
  }

  private async queueUrl(topic: string): Promise<string> {
    const configured = this.queueUrls[topic];
    if (configured) return configured;

    const cached = this.resolvedQueueUrls.get(topic);
    if (cached) return cached;

    const queueName = this.topicToQueueName(topic);
    const response = await this.client.send(
      new GetQueueUrlCommand({
        QueueName: queueName,
      }),
    );
    if (!response.QueueUrl) {
      throw new Error(`SQS queue URL not found for topic: ${topic}`);
    }
    this.resolvedQueueUrls.set(topic, response.QueueUrl);
    return response.QueueUrl;
  }
}

function defaultMessageGroupId(topic: string, message: unknown): string {
  if (message && typeof message === 'object') {
    const record = message as Record<string, unknown>;
    const tenantId = record.tenant_id ?? record.tenantId;
    if (typeof tenantId === 'string' && tenantId.trim()) {
      return tenantId;
    }
  }
  return topic;
}

function defaultDeduplicationId(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

function isFifoQueue(queueUrl: string): boolean {
  return queueUrl.endsWith('.fifo');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
