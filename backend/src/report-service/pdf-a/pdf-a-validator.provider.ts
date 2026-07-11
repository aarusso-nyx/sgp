import type { Provider } from '@nestjs/common';
import { NoopPdfAValidator, type PdfAValidator } from '@stynx-nyx/pdf-a';
import {
  VeraPdfDockerValidator,
  type VeraPdfDockerValidatorOptions,
} from '@stynx-nyx/pdf-a-vera-docker';

import {
  TelemetryPdfAValidator,
  type DocumentKind,
  type PdfATelemetryMetrics,
} from './pdf-a-validator-telemetry.decorator';

export const PDF_A_VALIDATOR = Symbol('PDF_A_VALIDATOR');

export type PdfAValidatorToken = typeof PDF_A_VALIDATOR;

export { NoopPdfAValidator };
export type { PdfAValidator };

function readVeraOptionsFromEnv(): VeraPdfDockerValidatorOptions {
  const opts: VeraPdfDockerValidatorOptions = {};
  if (process.env.STYNX_VERAPDF_IMAGE) {
    opts.image = process.env.STYNX_VERAPDF_IMAGE;
  }
  if (process.env.STYNX_VERAPDF_DOCKER_BIN) {
    opts.dockerBin = process.env.STYNX_VERAPDF_DOCKER_BIN;
  }
  if (process.env.STYNX_VERAPDF_TIMEOUT_MS) {
    const parsed = Number(process.env.STYNX_VERAPDF_TIMEOUT_MS);
    if (Number.isFinite(parsed) && parsed > 0) {
      opts.timeoutMs = parsed;
    }
  }
  return opts;
}

/**
 * Create the default PDF/A validator.
 *
 * - `noop` env: returns a bare `NoopPdfAValidator` (no telemetry — used in
 *   unit tests that explicitly set SGP_PDF_A_VALIDATOR=noop).
 * - Otherwise: wraps `VeraPdfDockerValidator` with `TelemetryPdfAValidator`
 *   so that every `validate()` call emits the three PDF/A metrics. The
 *   `defaultKind` is used when `.validate()` is called directly; the builder
 *   always calls `.validateAs(pdf, opts, kind)` with the exact document kind
 *   so the label is always accurate regardless of the default.
 *
 * The `metrics` parameter is optional; when omitted the global
 * `prometheusRegistry`-backed instance is used. Tests that want to assert
 * telemetry should pass an isolated metrics object via `wrapWithTelemetry()`
 * from the decorator module.
 */
export function createDefaultPdfAValidator(
  defaultKind: DocumentKind = 'payslip',
  metrics?: PdfATelemetryMetrics,
): PdfAValidator {
  if (process.env.SGP_PDF_A_VALIDATOR === 'noop') {
    return new NoopPdfAValidator();
  }
  const inner = new VeraPdfDockerValidator(readVeraOptionsFromEnv());
  return new TelemetryPdfAValidator(inner, defaultKind, metrics);
}

/**
 * Default DI provider for the PDF/A validator.
 *
 * Production wires `VeraPdfDockerValidator` wrapped with
 * `TelemetryPdfAValidator` (env-driven config + global registry). Unit tests
 * override this token with `NoopPdfAValidator` to avoid Docker. Set
 * `SGP_PDF_A_VALIDATOR=noop` in environments without a Docker daemon.
 *
 * `PdfABuilderService.runValidation` uses `isTelemetryValidator` + `validateAs`
 * to supply the exact `document_kind` label per call, so a single validator
 * instance serves both payslip and yearly_income correctly.
 */
export const PdfAValidatorProvider: Provider = {
  provide: PDF_A_VALIDATOR,
  useFactory: () => createDefaultPdfAValidator(),
};
