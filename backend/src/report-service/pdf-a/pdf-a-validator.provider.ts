import type { Provider } from '@nestjs/common';
import { NoopPdfAValidator, type PdfAValidator } from '@stynx/pdf-a';
import {
  VeraPdfDockerValidator,
  type VeraPdfDockerValidatorOptions,
} from '@stynx/pdf-a-vera-docker';

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

export function createDefaultPdfAValidator(): PdfAValidator {
  if (process.env.SGP_PDF_A_VALIDATOR === 'noop') {
    return new NoopPdfAValidator();
  }
  return new VeraPdfDockerValidator(readVeraOptionsFromEnv());
}

/**
 * Default DI provider for the PDF/A validator.
 *
 * Production wires `VeraPdfDockerValidator` (env-driven config); unit tests
 * override this token with `NoopPdfAValidator` to avoid Docker. Set
 * `SGP_PDF_A_VALIDATOR=noop` in environments without a Docker daemon.
 */
export const PdfAValidatorProvider: Provider = {
  provide: PDF_A_VALIDATOR,
  useFactory: createDefaultPdfAValidator,
};
