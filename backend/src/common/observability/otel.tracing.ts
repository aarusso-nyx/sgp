import type { INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

type AttributeValue = string | number | boolean;

type HttpRequestLike = {
  method?: string;
  originalUrl?: string;
  path?: string;
  baseUrl?: string;
  route?: { path?: string | RegExp };
  headers?: Record<string, string | string[] | undefined>;
};

type HttpResponseLike = {
  statusCode?: number;
  once: (event: 'finish', listener: () => void) => void;
};

type NextFunctionLike = () => void;

type SpanStatus = 'ok' | 'error';

export type RequestSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  entrypoint: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Record<string, AttributeValue>;
  status: SpanStatus;
};

export type RequestSpanExporter = {
  exportSpan: (span: RequestSpan) => Promise<void> | void;
};

type TracingOptions = {
  exporter?: RequestSpanExporter;
  now?: () => bigint;
};

const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i;

function boolEnv(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').toLowerCase());
}

function endpointFromEnv(): string | undefined {
  const explicit = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (explicit) return explicit;

  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (base) return new URL('/v1/traces', base).toString();

  return process.env.OTEL_TRACES_EXPORTER === 'otlp'
    ? 'http://localhost:4318/v1/traces'
    : undefined;
}

function parseResourceAttributes(): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const pair of (process.env.OTEL_RESOURCE_ATTRIBUTES ?? '').split(',')) {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('=');
    if (key && value) {
      attributes[key.trim()] = value.trim();
    }
  }

  return attributes;
}

function routePath(request: HttpRequestLike): string {
  const route = request.route?.path;
  if (typeof route === 'string') {
    return `${request.baseUrl ?? ''}${route}` || 'unknown';
  }
  return request.path ?? request.originalUrl?.split('?')[0] ?? 'unknown';
}

function headerValue(
  headers: HttpRequestLike['headers'],
  name: string,
): string | undefined {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function traceContext(request: HttpRequestLike): {
  traceId: string;
  parentSpanId?: string;
} {
  const traceparent = headerValue(request.headers, 'traceparent');
  const match = traceparent?.match(TRACEPARENT_PATTERN);
  if (match?.[1] && match[2]) {
    return { traceId: match[1].toLowerCase(), parentSpanId: match[2] };
  }
  return { traceId: randomBytes(16).toString('hex') };
}

function spanId(): string {
  return randomBytes(8).toString('hex');
}

function hrTimeUnixNano(): bigint {
  return BigInt(Date.now()) * 1_000_000n;
}

function toOtelValue(
  value: AttributeValue,
):
  | { stringValue: string }
  | { intValue: number }
  | { doubleValue: number }
  | { boolValue: boolean } {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number' && Number.isInteger(value)) {
    return { intValue: value };
  }
  if (typeof value === 'number') return { doubleValue: value };
  return { stringValue: value };
}

function toOtelAttributes(
  attributes: Record<string, AttributeValue>,
): Array<{ key: string; value: ReturnType<typeof toOtelValue> }> {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value: toOtelValue(value),
  }));
}

class OtlpHttpJsonSpanExporter implements RequestSpanExporter {
  constructor(
    private readonly endpoint: string,
    private readonly serviceName: string,
    private readonly resourceAttributes: Record<string, string>,
  ) {}

  exportSpan(span: RequestSpan): Promise<void> {
    const endpoint = new URL(this.endpoint);
    const body = JSON.stringify({
      resourceSpans: [
        {
          resource: {
            attributes: toOtelAttributes({
              'service.name': this.serviceName,
              ...this.resourceAttributes,
            }),
          },
          scopeSpans: [
            {
              scope: { name: 'sgp.local-otlp-http-tracing' },
              spans: [
                {
                  traceId: span.traceId,
                  spanId: span.spanId,
                  parentSpanId: span.parentSpanId,
                  name: span.name,
                  kind: 2,
                  startTimeUnixNano: span.startTimeUnixNano,
                  endTimeUnixNano: span.endTimeUnixNano,
                  attributes: toOtelAttributes(span.attributes),
                  status: { code: span.status === 'error' ? 2 : 1 },
                },
              ],
            },
          ],
        },
      ],
    });

    return new Promise((resolve, reject) => {
      const request = (
        endpoint.protocol === 'https:' ? httpsRequest : httpRequest
      )(
        endpoint,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body),
          },
        },
        (response) => {
          response.resume();
          response.on('end', () => {
            const statusCode = response.statusCode ?? 0;
            if (statusCode >= 200 && statusCode < 300) {
              resolve();
              return;
            }
            reject(
              new Error(`OTLP trace export failed with status ${statusCode}`),
            );
          });
        },
      );

      request.on('error', reject);
      request.end(body);
    });
  }
}

export function createOtelTraceExporter(
  entrypoint: string,
): RequestSpanExporter | undefined {
  if (boolEnv(process.env.OTEL_SDK_DISABLED)) return undefined;
  if (process.env.OTEL_TRACES_EXPORTER === 'none') return undefined;

  const endpoint = endpointFromEnv();
  if (!endpoint) return undefined;

  return new OtlpHttpJsonSpanExporter(
    endpoint,
    process.env.OTEL_SERVICE_NAME ?? entrypoint,
    parseResourceAttributes(),
  );
}

export function configureOpenTelemetryTracingEntrypoint(
  app: INestApplication,
  entrypoint: string,
  options: TracingOptions = {},
): void {
  const exporter = options.exporter ?? createOtelTraceExporter(entrypoint);
  if (!exporter) return;

  const now = options.now ?? hrTimeUnixNano;

  app.use(
    (
      request: HttpRequestLike,
      response: HttpResponseLike,
      next: NextFunctionLike,
    ) => {
      const startTimeUnixNano = now().toString();
      const context = traceContext(request);
      const route = routePath(request);
      const method = request.method ?? 'UNKNOWN';

      response.once('finish', () => {
        if (request.path === '/metrics') return;

        const statusCode = response.statusCode ?? 0;
        const span: RequestSpan = {
          ...context,
          spanId: spanId(),
          name: `${method} ${route}`,
          entrypoint,
          startTimeUnixNano,
          endTimeUnixNano: now().toString(),
          attributes: {
            'service.entrypoint': entrypoint,
            'http.request.method': method,
            'http.route': route,
            'http.response.status_code': statusCode,
          },
          status: statusCode >= 500 ? 'error' : 'ok',
        };

        void Promise.resolve(exporter.exportSpan(span)).catch(() => undefined);
      });

      next();
    },
  );
}
