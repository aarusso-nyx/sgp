import { EventEmitter } from 'node:events';

import { createPinoLoggerParams } from '../../../backend/src/common/logging/logging.config';
import {
  configureOpenTelemetryTracingEntrypoint,
  type RequestSpan,
} from '../../../backend/src/common/observability/otel.tracing';

class TestResponse extends EventEmitter {
  statusCode = 200;

  once(event: 'finish', listener: () => void): this {
    return super.once(event, listener);
  }
}

type RequestLike = {
  method: string;
  path: string;
  headers: Record<string, string>;
  traceId?: string | undefined;
};

describe('trace-id end-to-end correlation between OTel spans and Pino log lines', () => {
  it('threads the W3C trace-id from the incoming traceparent through the OTel span and the Pino customProps payload', () => {
    const exportedSpans: RequestSpan[] = [];
    const captured: { use?: (m: unknown) => void } = {};
    const useSpy = jest.fn((middleware: unknown) => {
      captured.use = middleware as (m: unknown) => void;
    });
    const fakeApp = { use: useSpy };

    configureOpenTelemetryTracingEntrypoint(fakeApp as never, 'sgp-core-api', {
      now: () => 1_700_000_000_000_000_000n,
      exporter: {
        exportSpan: (span) => {
          exportedSpans.push(span);
        },
      },
    });

    const middleware = useSpy.mock.calls[0]?.[0] as
      | ((
          request: RequestLike,
          response: TestResponse,
          next: () => void,
        ) => void)
      | undefined;
    expect(middleware).toBeDefined();

    const incomingTraceparent =
      '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const expectedTraceId = '0af7651916cd43dd8448eb211c80319c';

    const request: RequestLike = {
      method: 'GET',
      path: '/api/health',
      headers: { traceparent: incomingTraceparent },
    };
    const response = new TestResponse();

    middleware!(request, response, jest.fn());

    // The OTel middleware must populate request.traceId at request entry so
    // that downstream concerns (Pino customProps, audit writers) can pick it
    // up before the handler emits log lines.
    expect(request.traceId).toBe(expectedTraceId);

    // The Pino logger configuration's customProps callback consumes the
    // same field and emits the trace id on every log line in the request.
    const params = createPinoLoggerParams('sgp-core-api');
    const customProps = params.pinoHttp?.customProps as
      | ((req: unknown, res: unknown) => Record<string, unknown>)
      | undefined;
    expect(customProps).toBeDefined();
    const logProps = customProps!(request, response);
    expect(logProps).toEqual({ traceId: expectedTraceId });

    response.emit('finish');
    expect(exportedSpans).toHaveLength(1);

    // The exported span carries the trace id under the standard W3C field
    // and as the explicit `sgp.trace_id` attribute, so log search and the
    // OTel collector can pivot between log entries and spans by trace id.
    expect(exportedSpans[0]?.traceId).toBe(expectedTraceId);
    expect(exportedSpans[0]?.attributes['sgp.trace_id']).toBe(expectedTraceId);

    // Confirm the unified identifier is present in both signals.
    expect(logProps.traceId).toBe(exportedSpans[0]?.traceId);
  });

  it('falls back to a random trace-id and still threads it consistently when no traceparent is supplied', () => {
    const exportedSpans: RequestSpan[] = [];
    const useSpy = jest.fn();
    const fakeApp = { use: useSpy };

    configureOpenTelemetryTracingEntrypoint(fakeApp as never, 'sgp-core-api', {
      now: () => 1_700_000_001_000_000_000n,
      exporter: {
        exportSpan: (span) => {
          exportedSpans.push(span);
        },
      },
    });

    const middleware = useSpy.mock.calls[0]?.[0] as
      | ((
          request: RequestLike,
          response: TestResponse,
          next: () => void,
        ) => void)
      | undefined;
    const request: RequestLike = {
      method: 'POST',
      path: '/api/anything',
      headers: {},
    };
    const response = new TestResponse();

    middleware!(request, response, jest.fn());
    response.emit('finish');

    expect(request.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(exportedSpans).toHaveLength(1);
    expect(exportedSpans[0]?.traceId).toBe(request.traceId);
    expect(exportedSpans[0]?.attributes['sgp.trace_id']).toBe(request.traceId);

    const params = createPinoLoggerParams('sgp-core-api');
    const customProps = params.pinoHttp?.customProps as
      | ((req: unknown, res: unknown) => Record<string, unknown>)
      | undefined;
    expect(customProps!(request, response)).toEqual({
      traceId: request.traceId,
    });
  });

  it('omits traceId from log props when the OTel middleware has not run for the request', () => {
    const params = createPinoLoggerParams('sgp-core-api');
    const customProps = params.pinoHttp?.customProps as
      | ((req: unknown, res: unknown) => Record<string, unknown>)
      | undefined;
    expect(customProps!({}, {})).toEqual({});
  });
});
