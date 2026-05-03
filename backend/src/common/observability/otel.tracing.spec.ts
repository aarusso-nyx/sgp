import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  configureOpenTelemetryTracingEntrypoint,
  type RequestSpan,
} from './otel.tracing';

class TestResponse extends EventEmitter {
  statusCode = 200;

  once(event: 'finish', listener: () => void): this {
    return super.once(event, listener);
  }
}

describe('OpenTelemetry request tracing hooks', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('emits one request span when an HTTP response finishes', () => {
    const spans: RequestSpan[] = [];
    const use = jest.fn();
    const app = { use };

    configureOpenTelemetryTracingEntrypoint(app as never, 'sgp-core-api', {
      now: () => 1_000_000n,
      exporter: {
        exportSpan: (span) => {
          spans.push(span);
        },
      },
    });

    const middleware = use.mock.calls[0]?.[0] as (
      request: {
        method: string;
        path: string;
        headers: Record<string, string>;
      },
      response: TestResponse,
      next: () => void,
    ) => void;
    const response = new TestResponse();
    const next = jest.fn();

    middleware(
      {
        method: 'GET',
        path: '/api/health',
        headers: {
          traceparent:
            '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
      },
      response,
      next,
    );
    response.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toEqual(
      expect.objectContaining({
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        parentSpanId: '00f067aa0ba902b7',
        name: 'GET /api/health',
        entrypoint: 'sgp-core-api',
        startTimeUnixNano: '1000000',
        endTimeUnixNano: '1000000',
        status: 'ok',
      }),
    );
    expect(spans[0]?.attributes).toEqual(
      expect.objectContaining({
        'service.entrypoint': 'sgp-core-api',
        'http.request.method': 'GET',
        'http.route': '/api/health',
        'http.response.status_code': 200,
      }),
    );
  });

  it('exports request spans to a local OTLP HTTP collector endpoint', async () => {
    const received = new Promise<string>((resolve) => {
      const server = createServer((request, response) => {
        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => {
          body += chunk;
        });
        request.on('end', () => {
          response.writeHead(200).end();
          server.close();
          resolve(body);
        });
      });

      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address() as AddressInfo;
        process.env.OTEL_TRACES_EXPORTER = 'otlp';
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = `http://127.0.0.1:${port}/v1/traces`;
        process.env.OTEL_SERVICE_NAME = 'sgp-core-api-test';

        const app = { use: jest.fn() };
        configureOpenTelemetryTracingEntrypoint(app as never, 'sgp-core-api', {
          now: () => 2_000_000n,
        });

        const middleware = app.use.mock.calls[0]?.[0] as (
          request: {
            method: string;
            path: string;
            headers: Record<string, string>;
          },
          response: TestResponse,
          next: () => void,
        ) => void;
        const response = new TestResponse();

        middleware(
          { method: 'POST', path: '/api/ping', headers: {} },
          response,
          jest.fn(),
        );
        response.emit('finish');
      });
    });

    const payload = JSON.parse(await received) as {
      resourceSpans: Array<{
        resource: {
          attributes: Array<{
            key: string;
            value: { stringValue?: string };
          }>;
        };
        scopeSpans: Array<{
          spans: Array<{
            name: string;
            attributes: Array<{
              key: string;
              value: { stringValue?: string; intValue?: number };
            }>;
          }>;
        }>;
      }>;
    };

    expect(payload.resourceSpans[0]?.resource.attributes).toEqual(
      expect.arrayContaining([
        {
          key: 'service.name',
          value: { stringValue: 'sgp-core-api-test' },
        },
      ]),
    );
    expect(payload.resourceSpans[0]?.scopeSpans[0]?.spans[0]).toEqual(
      expect.objectContaining({
        name: 'POST /api/ping',
      }),
    );
  });
});
