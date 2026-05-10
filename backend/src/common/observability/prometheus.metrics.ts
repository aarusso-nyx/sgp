import type { INestApplication } from '@nestjs/common';

type LabelValues = Record<string, string | number | boolean | undefined>;

type HttpRequestLike = {
  method?: string | undefined;
  originalUrl?: string | undefined;
  path?: string | undefined;
  baseUrl?: string | undefined;
  route?: { path?: string | RegExp } | undefined;
};

type HttpResponseLike = {
  statusCode?: number | undefined;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
  once: (event: 'finish', listener: () => void) => void;
};

type NextFunctionLike = () => void;

type HttpServerLike = {
  get: (
    path: string,
    handler: (request: HttpRequestLike, response: HttpResponseLike) => void,
  ) => void;
};

const DEFAULT_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

function labelKey(labels: LabelValues): string {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value ?? '')}`)
    .join('\n');
}

function escapeLabelValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function formatLabels(labels: LabelValues): string {
  const entries = Object.entries(labels).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  if (entries.length === 0) return '';

  return `{${entries
    .map(([key, value]) => `${key}="${escapeLabelValue(String(value ?? ''))}"`)
    .join(',')}}`;
}

function routePath(request: HttpRequestLike): string {
  const route = request.route?.path;
  if (typeof route === 'string') {
    return `${request.baseUrl ?? ''}${route}` || 'unknown';
  }
  return request.path ?? request.originalUrl?.split('?')[0] ?? 'unknown';
}

abstract class Metric {
  constructor(
    readonly name: string,
    readonly help: string,
    readonly type: 'counter' | 'gauge' | 'histogram',
  ) {}

  abstract collect(): string[];
}

class Counter extends Metric {
  private readonly values = new Map<
    string,
    { labels: LabelValues; value: number }
  >();

  constructor(name: string, help: string) {
    super(name, help, 'counter');
  }

  increment(labels: LabelValues = {}, value = 1): void {
    const key = labelKey(labels);
    const current = this.values.get(key);
    this.values.set(key, {
      labels,
      value: (current?.value ?? 0) + value,
    });
  }

  collect(): string[] {
    return Array.from(this.values.values()).map(
      ({ labels, value }) => `${this.name}${formatLabels(labels)} ${value}`,
    );
  }
}

class Gauge extends Metric {
  private readonly values = new Map<
    string,
    { labels: LabelValues; value: number }
  >();

  constructor(name: string, help: string) {
    super(name, help, 'gauge');
  }

  set(labels: LabelValues = {}, value: number): void {
    this.values.set(labelKey(labels), { labels, value });
  }

  collect(): string[] {
    return Array.from(this.values.values()).map(
      ({ labels, value }) => `${this.name}${formatLabels(labels)} ${value}`,
    );
  }
}

class Histogram extends Metric {
  private readonly values = new Map<
    string,
    { labels: LabelValues; buckets: number[]; count: number; sum: number }
  >();

  constructor(
    name: string,
    help: string,
    private readonly bucketBounds = DEFAULT_BUCKETS,
  ) {
    super(name, help, 'histogram');
  }

  observe(labels: LabelValues, value: number): void {
    const key = labelKey(labels);
    const current =
      this.values.get(key) ??
      ({
        labels,
        buckets: this.bucketBounds.map(() => 0),
        count: 0,
        sum: 0,
      } satisfies {
        labels: LabelValues;
        buckets: number[];
        count: number;
        sum: number;
      });

    this.bucketBounds.forEach((bucket, index) => {
      if (value <= bucket) {
        current.buckets[index] = (current.buckets[index] ?? 0) + 1;
      }
    });
    current.count += 1;
    current.sum += value;
    this.values.set(key, current);
  }

  collect(): string[] {
    const lines: string[] = [];

    for (const { labels, buckets, count, sum } of this.values.values()) {
      this.bucketBounds.forEach((bucket, index) => {
        lines.push(
          `${this.name}_bucket${formatLabels({ ...labels, le: bucket })} ${
            buckets[index] ?? 0
          }`,
        );
      });
      lines.push(
        `${this.name}_bucket${formatLabels({ ...labels, le: '+Inf' })} ${count}`,
      );
      lines.push(`${this.name}_sum${formatLabels(labels)} ${sum}`);
      lines.push(`${this.name}_count${formatLabels(labels)} ${count}`);
    }

    return lines;
  }
}

class PrometheusRegistry {
  private readonly metrics: Metric[] = [];

  register<T extends Metric>(metric: T): T {
    this.metrics.push(metric);
    return metric;
  }

  metricNames(): string[] {
    return this.metrics.map((metric) => metric.name);
  }

  contentType(): string {
    return 'text/plain; version=0.0.4; charset=utf-8';
  }

  collect(): string {
    const lines = this.metrics.flatMap((metric) => [
      `# HELP ${metric.name} ${metric.help}`,
      `# TYPE ${metric.name} ${metric.type}`,
      ...metric.collect(),
    ]);

    return `${lines.join('\n')}\n`;
  }
}

export const prometheusRegistry = new PrometheusRegistry();

export const httpRequestDurationSeconds = prometheusRegistry.register(
  new Histogram(
    'sgp_http_request_duration_seconds',
    'HTTP request duration by entrypoint, method, route, and status code.',
  ),
);

export const httpRequestsTotal = prometheusRegistry.register(
  new Counter(
    'sgp_http_requests_total',
    'HTTP requests by entrypoint, method, route, and status code.',
  ),
);

export const queueDepth = prometheusRegistry.register(
  new Gauge('sgp_queue_depth', 'Current queue depth by queue name.'),
);

export const workerActiveClaims = prometheusRegistry.register(
  new Gauge(
    'sgp_worker_active_claims',
    'Current active worker claim count by worker name.',
  ),
);

export const auditEventsEmittedTotal = prometheusRegistry.register(
  new Counter(
    'sgp_audit_events_emitted_total',
    'Audit events emitted by controller and route.',
  ),
);

export const esocialSubmissionsTotal = prometheusRegistry.register(
  new Counter(
    'sgp_esocial_submissions_total',
    'eSocial submissions by event type and status.',
  ),
);

export const dctfwebTransmissionsTotal = prometheusRegistry.register(
  new Counter(
    'sgp_dctfweb_transmissions_total',
    'DCTFWeb transmissions by status.',
  ),
);

export const payrollOperationsTotal = prometheusRegistry.register(
  new Counter(
    'sgp_payroll_operations_total',
    'Payroll operations by operation name and status.',
  ),
);

export const workerPollsTotal = prometheusRegistry.register(
  new Counter(
    'sgp_worker_polls_total',
    'Worker poll attempts by worker and status.',
  ),
);

export const workerPollDurationSeconds = prometheusRegistry.register(
  new Histogram(
    'sgp_worker_poll_duration_seconds',
    'Worker poll duration by worker and status.',
  ),
);

export function recordQueueDepth(queue: string, depth: number): void {
  queueDepth.set({ queue }, depth);
}

export function recordWorkerActiveClaims(
  worker: string,
  activeClaims: number,
): void {
  workerActiveClaims.set({ worker }, activeClaims);
}

export function recordAuditEvent(controller: string, route: string): void {
  auditEventsEmittedTotal.increment({ controller, route });
}

export function recordEsocialSubmission(
  status: string,
  eventType: string,
): void {
  esocialSubmissionsTotal.increment({ event_type: eventType, status });
}

export function recordDctfwebTransmission(status: string): void {
  dctfwebTransmissionsTotal.increment({ status });
}

export function recordPayrollOperation(
  operation: string,
  status: string,
): void {
  payrollOperationsTotal.increment({ operation, status });
}

export function recordWorkerPoll(
  worker: string,
  status: string,
  durationSeconds: number,
): void {
  const labels = { worker, status };
  workerPollsTotal.increment(labels);
  workerPollDurationSeconds.observe(labels, durationSeconds);
}

export function configurePrometheusMetricsEntrypoint(
  app: INestApplication,
  entrypoint: string,
): void {
  app.use(
    (
      request: HttpRequestLike,
      response: HttpResponseLike,
      next: NextFunctionLike,
    ) => {
      const start = performance.now();

      response.once('finish', () => {
        if (request.path === '/metrics') return;

        const labels = {
          entrypoint,
          method: request.method ?? 'UNKNOWN',
          route: routePath(request),
          status_code: response.statusCode ?? 0,
        };
        httpRequestsTotal.increment(labels);
        httpRequestDurationSeconds.observe(
          labels,
          (performance.now() - start) / 1000,
        );
      });

      next();
    },
  );

  const server = app.getHttpAdapter().getInstance() as HttpServerLike;
  server.get('/metrics', (_request, response) => {
    response.setHeader('Content-Type', prometheusRegistry.contentType());
    response.end(prometheusRegistry.collect());
  });
}
