import type {
  PdfAValidateOptions,
  PdfAValidationResult,
  PdfAValidator,
} from '@stynx-nyx/pdf-a';

import {
  createPdfATelemetryMetrics,
  TelemetryCounter,
  TelemetryHistogram,
  TelemetryPdfAValidator,
  wrapWithTelemetry,
  type PdfATelemetryMetrics,
  type TelemetryRegistry,
} from './pdf-a-validator-telemetry.decorator';

// ---------------------------------------------------------------------------
// Minimal in-memory registry — does NOT touch the global prometheusRegistry
// ---------------------------------------------------------------------------

class StubMetric {
  readonly name: string;
  readonly help: string;
  readonly type: string;
  constructor(name: string, help: string, type: string) {
    this.name = name;
    this.help = help;
    this.type = type;
  }
  collect(): string[] {
    return [];
  }
}

class StubRegistry implements TelemetryRegistry {
  readonly registered: StubMetric[] = [];
  register<T extends StubMetric>(metric: T): T {
    this.registered.push(metric);
    return metric;
  }
}

// ---------------------------------------------------------------------------
// Spy PdfAValidator
// ---------------------------------------------------------------------------

class SpyValidator implements PdfAValidator {
  readonly calls: Array<{
    pdf: Uint8Array;
    opts: PdfAValidateOptions | undefined;
  }> = [];

  constructor(
    private readonly response:
      | PdfAValidationResult
      | (() => Promise<PdfAValidationResult>),
  ) {}

  validate(
    pdf: Uint8Array,
    opts?: PdfAValidateOptions,
  ): Promise<PdfAValidationResult> {
    this.calls.push({ pdf, opts });
    if (typeof this.response === 'function') {
      return this.response();
    }
    return Promise.resolve(this.response);
  }
}

class ThrowingValidator implements PdfAValidator {
  validate(
    _pdf: Uint8Array,
    _opts?: PdfAValidateOptions,
  ): Promise<PdfAValidationResult> {
    return Promise.reject(new Error('docker-unavailable'));
  }
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeValidResult(): PdfAValidationResult {
  return {
    valid: true,
    declared: { version: 'A-2', conformance: 'b' },
    rulesetVersion: 'test-valid',
    validatedAt: new Date().toISOString(),
    durationMs: 10,
    errors: [],
  };
}

function makeInvalidResult(ruleIds: string[]): PdfAValidationResult {
  return {
    valid: false,
    declared: { version: 'A-2', conformance: 'b' },
    rulesetVersion: 'test-invalid',
    validatedAt: new Date().toISOString(),
    durationMs: 20,
    errors: ruleIds.map((ruleId) => ({
      ruleId,
      severity: 'error' as const,
      clause: `PDF/A-2:${ruleId}`,
      message: `Rule ${ruleId} violated.`,
    })),
  };
}

// Build an isolated metrics object backed by real Counter/Histogram instances
// but registered against a stub registry (no global side effects).
function buildIsolatedMetrics(): PdfATelemetryMetrics {
  const stub = new StubRegistry();
  return createPdfATelemetryMetrics(
    stub as unknown as import('./pdf-a-validator-telemetry.decorator').TelemetryRegistry,
  );
}

const DUMMY_PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TelemetryPdfAValidator', () => {
  describe('valid result with empty errors', () => {
    it('increments attempts=1, records no errors, records duration with document_kind', async () => {
      const metrics = buildIsolatedMetrics();
      const spy = new SpyValidator(makeValidResult());
      const decorator = new TelemetryPdfAValidator(spy, 'payslip', metrics);

      const result = await decorator.validate(DUMMY_PDF, {
        version: 'A-2',
        conformance: 'b',
      });

      expect(result.valid).toBe(true);
      expect(spy.calls).toHaveLength(1);

      // attempts counter
      const attemptsLines = metrics.attemptsTotal.collect();
      expect(attemptsLines).toEqual([
        'sgp_pdf_a_validation_attempts_total{document_kind="payslip"} 1',
      ]);

      // errors counter — should have no entries
      expect(metrics.errorsTotal.collect()).toEqual([]);

      // duration histogram — must have at least one bucket and count line
      const durationLines = metrics.durationMs.collect();
      expect(
        durationLines.some((l) => l.includes('document_kind="payslip"')),
      ).toBe(true);
      const countLine = durationLines.find((l) =>
        l.startsWith('sgp_pdf_a_validation_duration_ms_count'),
      );
      expect(countLine).toBeDefined();
      expect(countLine).toContain('} 1');
    });
  });

  describe('invalid result with 3 different rule errors', () => {
    it('increments attempts=1, errors=3 (one per rule), duration recorded', async () => {
      const metrics = buildIsolatedMetrics();
      const ruleIds = ['6.6.4-1', '7.3.1-1', '4.2.2-1'];
      const spy = new SpyValidator(makeInvalidResult(ruleIds));
      const decorator = new TelemetryPdfAValidator(
        spy,
        'yearly_income',
        metrics,
      );

      const result = await decorator.validate(DUMMY_PDF);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);

      // attempts
      expect(metrics.attemptsTotal.collect()).toEqual([
        'sgp_pdf_a_validation_attempts_total{document_kind="yearly_income"} 1',
      ]);

      // errors — one increment per rule_id
      const errorLines = metrics.errorsTotal.collect();
      expect(errorLines).toHaveLength(3);
      expect(errorLines).toContain(
        'sgp_pdf_a_validation_errors_total{document_kind="yearly_income",rule_id="6.6.4-1"} 1',
      );
      expect(errorLines).toContain(
        'sgp_pdf_a_validation_errors_total{document_kind="yearly_income",rule_id="7.3.1-1"} 1',
      );
      expect(errorLines).toContain(
        'sgp_pdf_a_validation_errors_total{document_kind="yearly_income",rule_id="4.2.2-1"} 1',
      );

      // duration
      const countLine = metrics.durationMs
        .collect()
        .find((l) => l.startsWith('sgp_pdf_a_validation_duration_ms_count'));
      expect(countLine).toContain('} 1');
    });
  });

  describe('validator throws', () => {
    it('still records attempts and duration, then re-throws', async () => {
      const metrics = buildIsolatedMetrics();
      const decorator = new TelemetryPdfAValidator(
        new ThrowingValidator(),
        'payslip',
        metrics,
      );

      await expect(decorator.validate(DUMMY_PDF)).rejects.toThrow(
        'docker-unavailable',
      );

      // attempts must have been incremented before the throw
      expect(metrics.attemptsTotal.collect()).toEqual([
        'sgp_pdf_a_validation_attempts_total{document_kind="payslip"} 1',
      ]);

      // duration must have been recorded in the finally block
      const countLine = metrics.durationMs
        .collect()
        .find((l) => l.startsWith('sgp_pdf_a_validation_duration_ms_count'));
      expect(countLine).toContain('} 1');

      // no errors should be recorded (no result was produced)
      expect(metrics.errorsTotal.collect()).toEqual([]);
    });
  });

  describe('validateAs per-call kind override', () => {
    it('uses the supplied kind instead of the constructor default', async () => {
      const metrics = buildIsolatedMetrics();
      const spy = new SpyValidator(makeValidResult());
      // constructed with 'payslip' default
      const decorator = new TelemetryPdfAValidator(spy, 'payslip', metrics);

      // but called with 'yearly_income' kind
      await decorator.validateAs(DUMMY_PDF, undefined, 'yearly_income');

      expect(metrics.attemptsTotal.collect()).toEqual([
        'sgp_pdf_a_validation_attempts_total{document_kind="yearly_income"} 1',
      ]);
    });
  });

  describe('document_kind label on all three metrics', () => {
    it('all three metric names carry the document_kind label', async () => {
      const metrics = buildIsolatedMetrics();
      const spy = new SpyValidator(makeInvalidResult(['6.1.3-1']));
      const decorator = new TelemetryPdfAValidator(spy, 'payslip', metrics);

      await decorator.validate(DUMMY_PDF);

      const attemptsLine = metrics.attemptsTotal.collect()[0]!;
      expect(attemptsLine).toContain('document_kind="payslip"');

      const errorsLine = metrics.errorsTotal.collect()[0]!;
      expect(errorsLine).toContain('document_kind="payslip"');

      const durationLines = metrics.durationMs.collect();
      expect(
        durationLines.every((l) => l.includes('document_kind="payslip"')),
      ).toBe(true);
    });
  });

  describe('wrapWithTelemetry helper', () => {
    it('constructs a TelemetryPdfAValidator with the supplied metrics', async () => {
      const metrics = buildIsolatedMetrics();
      const spy = new SpyValidator(makeValidResult());
      const decorated = wrapWithTelemetry(spy, 'yearly_income', metrics);

      await decorated.validate(DUMMY_PDF);

      expect(metrics.attemptsTotal.collect()).toEqual([
        'sgp_pdf_a_validation_attempts_total{document_kind="yearly_income"} 1',
      ]);
    });
  });
});

describe('createPdfATelemetryMetrics', () => {
  it('registers three metrics with correct names and types', () => {
    const stub = new StubRegistry();
    const m = createPdfATelemetryMetrics(
      stub as unknown as import('./pdf-a-validator-telemetry.decorator').TelemetryRegistry,
    );

    expect(m.attemptsTotal).toBeInstanceOf(TelemetryCounter);
    expect(m.errorsTotal).toBeInstanceOf(TelemetryCounter);
    expect(m.durationMs).toBeInstanceOf(TelemetryHistogram);

    expect(m.attemptsTotal.name).toBe('sgp_pdf_a_validation_attempts_total');
    expect(m.errorsTotal.name).toBe('sgp_pdf_a_validation_errors_total');
    expect(m.durationMs.name).toBe('sgp_pdf_a_validation_duration_ms');

    expect(m.attemptsTotal.type).toBe('counter');
    expect(m.errorsTotal.type).toBe('counter');
    expect(m.durationMs.type).toBe('histogram');
  });
});
