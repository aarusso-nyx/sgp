import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  configureOpenTelemetryTracingEntrypoint,
  createOtelTraceExporter,
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

  it('handles route edge cases and skips metrics spans', () => {
    const spans: RequestSpan[] = [];
    const app = { use: jest.fn() };

    configureOpenTelemetryTracingEntrypoint(app as never, 'sgp-portal-api', {
      now: () => 3_000_000n,
      exporter: {
        exportSpan: (span) => {
          spans.push(span);
        },
      },
    });

    const middleware = app.use.mock.calls[0]?.[0] as (
      request: {
        method?: string | undefined;
        path?: string | undefined;
        originalUrl?: string | undefined;
        baseUrl?: string | undefined;
        route?: { path?: string } | undefined;
        headers?: Record<string, string | string[] | undefined>;
      },
      response: TestResponse,
      next: () => void,
    ) => void;

    const routedResponse = new TestResponse();
    routedResponse.statusCode = 503;
    middleware(
      {
        baseUrl: '/api',
        route: { path: '/avaliacoes/:id' },
        headers: {
          traceparent: [
            '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01',
          ],
        },
      },
      routedResponse,
      jest.fn(),
    );
    routedResponse.emit('finish');

    const fallbackResponse = new TestResponse();
    middleware(
      {
        originalUrl: '/api/fallback?debug=true',
        headers: { traceparent: 'invalid' },
      },
      fallbackResponse,
      jest.fn(),
    );
    fallbackResponse.emit('finish');

    const metricsResponse = new TestResponse();
    middleware(
      { method: 'GET', path: '/metrics', headers: {} },
      metricsResponse,
      jest.fn(),
    );
    metricsResponse.emit('finish');

    expect(spans).toHaveLength(2);
    expect(spans[0]).toEqual(
      expect.objectContaining({
        traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        parentSpanId: 'bbbbbbbbbbbbbbbb',
        name: 'UNKNOWN /api/avaliacoes/:id',
        status: 'error',
      }),
    );
    expect(spans[1]).toEqual(
      expect.objectContaining({
        name: 'UNKNOWN /api/fallback',
        status: 'ok',
      }),
    );
  });

  it('honors exporter environment switches', () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    delete process.env.OTEL_TRACES_EXPORTER;

    process.env.OTEL_SDK_DISABLED = 'true';
    expect(createOtelTraceExporter('sgp-core-api')).toBeUndefined();

    process.env.OTEL_SDK_DISABLED = 'false';
    process.env.OTEL_TRACES_EXPORTER = 'none';
    expect(createOtelTraceExporter('sgp-core-api')).toBeUndefined();

    delete process.env.OTEL_TRACES_EXPORTER;
    expect(createOtelTraceExporter('sgp-core-api')).toBeUndefined();
  });

  it('derives base OTLP endpoints and serializes resource/span attributes', async () => {
    const received = new Promise<string>((resolve) => {
      const server = createServer((request, response) => {
        expect(request.url).toBe('/v1/traces');
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
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://127.0.0.1:${port}/collector`;
        process.env.OTEL_RESOURCE_ATTRIBUTES =
          'deployment.environment=test,service.version=1=2,ignored=';
        delete process.env.OTEL_SERVICE_NAME;
        delete process.env.OTEL_TRACES_EXPORTER;

        const exporter = createOtelTraceExporter('sgp-report-service');
        void exporter?.exportSpan({
          traceId: 'cccccccccccccccccccccccccccccccc',
          spanId: 'dddddddddddddddd',
          name: 'POST /api/reports',
          entrypoint: 'sgp-report-service',
          startTimeUnixNano: '1',
          endTimeUnixNano: '2',
          attributes: {
            'http.request.method': 'POST',
            'http.response.status_code': 201,
            'sgp.test.enabled': true,
            'sgp.test.ratio': 1.5,
          },
          status: 'error',
        });
      });
    });

    const payload = JSON.parse(await received) as {
      resourceSpans: Array<{
        resource: {
          attributes: Array<{
            key: string;
            value: { stringValue?: string; intValue?: number };
          }>;
        };
        scopeSpans: Array<{
          spans: Array<{
            status: { code: number };
            attributes: Array<{
              key: string;
              value: {
                stringValue?: string | undefined;
                intValue?: number | undefined;
                doubleValue?: number | undefined;
                boolValue?: boolean | undefined;
              };
            }>;
          }>;
        }>;
      }>;
    };
    const resourceAttributes = payload.resourceSpans[0]?.resource.attributes;
    const span = payload.resourceSpans[0]?.scopeSpans[0]?.spans[0];

    expect(resourceAttributes).toEqual(
      expect.arrayContaining([
        {
          key: 'service.name',
          value: { stringValue: 'sgp-report-service' },
        },
        {
          key: 'deployment.environment',
          value: { stringValue: 'test' },
        },
        {
          key: 'service.version',
          value: { stringValue: '1=2' },
        },
      ]),
    );
    expect(resourceAttributes).not.toEqual(
      expect.arrayContaining([
        {
          key: 'ignored',
          value: expect.anything(),
        },
      ]),
    );
    expect(span).toEqual(expect.objectContaining({ status: { code: 2 } }));
    expect(span?.attributes).toEqual(
      expect.arrayContaining([
        {
          key: 'http.request.method',
          value: { stringValue: 'POST' },
        },
        {
          key: 'http.response.status_code',
          value: { intValue: 201 },
        },
        {
          key: 'sgp.test.enabled',
          value: { boolValue: true },
        },
        {
          key: 'sgp.test.ratio',
          value: { doubleValue: 1.5 },
        },
      ]),
    );
  });
});
