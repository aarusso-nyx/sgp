import type {
  PdfAValidateOptions,
  PdfAValidationResult,
  PdfAValidator,
} from '@stynx-nyx/pdf-a';

import { prometheusRegistry } from '../../common/observability/prometheus.metrics';

// ---------------------------------------------------------------------------
// Minimal metric primitives — mirrors the shape of Counter/Histogram in
// prometheus.metrics.ts but kept local so tests can supply an isolated
// registry without touching the global singleton.
// ---------------------------------------------------------------------------

type LabelValues = Record<string, string | number | boolean | undefined>;

function labelKey(labels: LabelValues): string {
  return Object.entries(labels)
    .sort(([l], [r]) => l.localeCompare(r))
    .map(([k, v]) => `${k}=${String(v ?? '')}`)
    .join('\n');
}

function escapeLabelValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function formatLabels(labels: LabelValues): string {
  const entries = Object.entries(labels).sort(([l], [r]) => l.localeCompare(r));
  if (entries.length === 0) return '';
  return `{${entries
    .map(([k, v]) => `${k}="${escapeLabelValue(String(v ?? ''))}"`)
    .join(',')}}`;
}

abstract class Metric {
  constructor(
    readonly name: string,
    readonly help: string,
    readonly type: 'counter' | 'histogram',
  ) {}
  abstract collect(): string[];
}

export class TelemetryCounter extends Metric {
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
    this.values.set(key, { labels, value: (current?.value ?? 0) + value });
  }

  collect(): string[] {
    return Array.from(this.values.values()).map(
      ({ labels, value }) => `${this.name}${formatLabels(labels)} ${value}`,
    );
  }
}

export class TelemetryHistogram extends Metric {
  // Millisecond-appropriate bucket bounds (5 ms … 10 000 ms)
  static readonly BUCKETS = [
    5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
  ];

  private readonly values = new Map<
    string,
    { labels: LabelValues; buckets: number[]; count: number; sum: number }
  >();

  constructor(name: string, help: string) {
    super(name, help, 'histogram');
  }

  observe(labels: LabelValues, value: number): void {
    const key = labelKey(labels);
    const current = this.values.get(key) ?? {
      labels,
      buckets: TelemetryHistogram.BUCKETS.map(() => 0),
      count: 0,
      sum: 0,
    };
    TelemetryHistogram.BUCKETS.forEach((bound, index) => {
      if (value <= bound) {
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
      TelemetryHistogram.BUCKETS.forEach((bound, index) => {
        lines.push(
          `${this.name}_bucket${formatLabels({ ...labels, le: bound })} ${buckets[index] ?? 0}`,
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

/**
 * Minimal registry interface satisfied by the global `prometheusRegistry` and
 * by any in-memory test stub.
 */
export interface TelemetryRegistry {
  register<T extends Metric>(metric: T): T;
}

export interface PdfATelemetryMetrics {
  attemptsTotal: TelemetryCounter;
  errorsTotal: TelemetryCounter;
  durationMs: TelemetryHistogram;
}

/**
 * Build and register the three PDF/A telemetry metrics against `registry`.
 * Call once at startup with the global registry, or once per test with an
 * isolated stub.
 */
export function createPdfATelemetryMetrics(
  registry: TelemetryRegistry,
): PdfATelemetryMetrics {
  return {
    attemptsTotal: registry.register(
      new TelemetryCounter(
        'sgp_pdf_a_validation_attempts_total',
        'Total PDF/A validation attempts by document kind.',
      ),
    ),
    errorsTotal: registry.register(
      new TelemetryCounter(
        'sgp_pdf_a_validation_errors_total',
        'PDF/A validation rule errors by rule ID and document kind.',
      ),
    ),
    durationMs: registry.register(
      new TelemetryHistogram(
        'sgp_pdf_a_validation_duration_ms',
        'Wall-clock time per PDF/A validate() call in milliseconds, by document kind.',
      ),
    ),
  };
}

/**
 * Module-level registration against the global Prometheus registry. These are
 * the live metrics scraped at /metrics. Tests should NOT use this instance —
 * use `createPdfATelemetryMetrics(stubRegistry)` instead.
 */
export const globalPdfATelemetryMetrics: PdfATelemetryMetrics =
  createPdfATelemetryMetrics(prometheusRegistry);

// ---------------------------------------------------------------------------
// Document-kind type
// ---------------------------------------------------------------------------

export type DocumentKind = 'payslip' | 'yearly_income';

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------

/**
 * `TelemetryPdfAValidator` wraps any `PdfAValidator` and emits three
 * Prometheus metrics for every `validate()` call:
 *
 *   sgp_pdf_a_validation_attempts_total{document_kind}
 *   sgp_pdf_a_validation_errors_total{document_kind,rule_id}  (per error)
 *   sgp_pdf_a_validation_duration_ms{document_kind}
 *
 * The decorator does **not** change the warn-only failure policy: if
 * `validate()` throws, the error is re-thrown after recording the duration
 * (try/finally). A `valid:false` result is returned unchanged — the builder
 * owns the logging decision.
 *
 * Per-call kind override: callers may invoke `validateAs(pdf, opts, kind)`
 * to override the constructor-set kind for a single call. `PdfABuilderService`
 * uses this so one validator instance can correctly label both payslip and
 * yearly_income requests.
 */
export class TelemetryPdfAValidator implements PdfAValidator {
  private readonly metrics: PdfATelemetryMetrics;

  constructor(
    private readonly inner: PdfAValidator,
    private readonly defaultKind: DocumentKind,
    metrics?: PdfATelemetryMetrics,
  ) {
    this.metrics = metrics ?? globalPdfATelemetryMetrics;
  }

  /** Satisfies `PdfAValidator`; uses the constructor-set `defaultKind`. */
  validate(
    pdf: Uint8Array,
    opts?: PdfAValidateOptions,
  ): Promise<PdfAValidationResult> {
    return this.validateAs(pdf, opts, this.defaultKind);
  }

  /**
   * Validate with an explicit `documentKind` label, overriding the default.
   * Used by `PdfABuilderService.runValidation` so a single validator instance
   * correctly labels both payslip and yearly_income calls.
   */
  async validateAs(
    pdf: Uint8Array,
    opts: PdfAValidateOptions | undefined,
    kind: DocumentKind,
  ): Promise<PdfAValidationResult> {
    const start = performance.now();
    const kindLabel = { document_kind: kind };

    this.metrics.attemptsTotal.increment(kindLabel);

    let result: PdfAValidationResult;
    try {
      result = await this.inner.validate(pdf, opts);
    } finally {
      this.metrics.durationMs.observe(kindLabel, performance.now() - start);
    }

    for (const error of result.errors) {
      this.metrics.errorsTotal.increment({
        document_kind: kind,
        rule_id: error.ruleId,
      });
    }

    return result;
  }
}

/**
 * Type guard: returns true if `v` is a `TelemetryPdfAValidator` and therefore
 * supports per-call `validateAs(pdf, opts, kind)`.
 */
export function isTelemetryValidator(
  v: PdfAValidator,
): v is TelemetryPdfAValidator {
  return v instanceof TelemetryPdfAValidator;
}

/**
 * Convenience helper for tests: wrap an arbitrary `PdfAValidator` with
 * telemetry backed by a caller-supplied (isolated) metrics object.
 */
export function wrapWithTelemetry(
  inner: PdfAValidator,
  kind: DocumentKind,
  metrics: PdfATelemetryMetrics,
): TelemetryPdfAValidator {
  return new TelemetryPdfAValidator(inner, kind, metrics);
}
