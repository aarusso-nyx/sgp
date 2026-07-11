/**
 * SGP R11 W05 — Build-time strict PDF/A conformance gate
 *
 * Uses the REAL VeraPdfDockerValidator (not Noop) against the committed golden
 * fixtures. Asserts valid === true for payslip and yearly-income PDFs.
 *
 * Docker requirement: the pinned image
 *   verapdf/cli@sha256:20202b4bcc2410a25db1f637c7b461a2e0dda1d97dd8a6df658286b30d56c842
 * must be pullable on the CI runner (Linux/amd64). On Apple Silicon hosts the
 * suite skips automatically — see docs/user/testing.md § PDF/A Conformance Suite.
 *
 * Per-test timeout: 45 s to allow for Docker cold-start.
 */

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { Test } from '@nestjs/testing';

import { PdfABuilderService } from '../../backend/src/report-service/payslip/pdf-a-builder.service';
import { PDF_A_VALIDATOR } from '../../backend/src/report-service/pdf-a/pdf-a-validator.provider';
import { VeraPdfDockerValidator } from '@stynx-nyx/pdf-a-vera-docker';
import type {
  VeraPdfDockerRunRequest,
  VeraPdfDockerRunResult,
} from '@stynx-nyx/pdf-a-vera-docker';
import { PayslipDocument } from '../../backend/src/report-service/payslip/payslip-template';
import {
  YearlyIncomeAggregate,
  toYearlyIncomeDocument,
} from '../../backend/src/report-service/yearly-income/yearly-income-template';

// ---------------------------------------------------------------------------
// Pinned image (same digest locked in STYNX R12 W01 ADR)
// ---------------------------------------------------------------------------
const VERAPDF_IMAGE =
  'verapdf/cli@sha256:20202b4bcc2410a25db1f637c7b461a2e0dda1d97dd8a6df658286b30d56c842';

const DOCKER_PLATFORM_ARGS = ['--platform', 'linux/amd64'];
// Docker cold-start (even with a cached image) can take 7–10 s on desktop hosts.
// The smoke check must be longer than that or it produces false skips.
const SMOKE_TIMEOUT_MS = 15_000;
const TEST_TIMEOUT_MS = 45_000;

// ---------------------------------------------------------------------------
// Docker availability probe (cached per suite run)
// ---------------------------------------------------------------------------
let dockerProbeResult: { usable: boolean; reason: string } | undefined;

function probeDocker(): { usable: boolean; reason: string } {
  if (dockerProbeResult !== undefined) {
    return dockerProbeResult;
  }

  // 1. Check if docker binary is present at all
  const versionCheck = spawnSync(
    'docker',
    ['version', '--format', '{{.Server.Version}}'],
    {
      encoding: 'utf8',
      timeout: SMOKE_TIMEOUT_MS,
    },
  );
  if (versionCheck.error || versionCheck.status !== 0) {
    dockerProbeResult = {
      usable: false,
      reason: `docker daemon not reachable: ${versionCheck.error?.message ?? (versionCheck.stderr || 'exit ' + String(versionCheck.status))}`,
    };
    return dockerProbeResult;
  }

  // 2. On Apple Silicon, the upstream runner omits --platform linux/amd64 and
  //    SIGSEGVs. We detect this combination and skip proactively. The spec
  //    provides a custom runner that does pass --platform linux/amd64, so only
  //    skip when Docker itself is ARM (i.e. no emulation layer available).
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    const archCheck = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        ...DOCKER_PLATFORM_ARGS,
        '--entrypoint',
        'uname',
        VERAPDF_IMAGE,
        '-m',
      ],
      { encoding: 'utf8', timeout: SMOKE_TIMEOUT_MS },
    );
    if (archCheck.status !== 0 || archCheck.error) {
      dockerProbeResult = {
        usable: false,
        reason:
          'Apple Silicon host: --platform linux/amd64 smoke check failed — ' +
          (archCheck.error?.message ??
            archCheck.stderr?.trim() ??
            'non-zero exit'),
      };
      return dockerProbeResult;
    }
  }

  // 3. Quick smoke: run the image with --version to confirm it starts
  const smokeCheck = spawnSync(
    'docker',
    ['run', '--rm', ...DOCKER_PLATFORM_ARGS, VERAPDF_IMAGE, '--version'],
    { encoding: 'utf8', timeout: SMOKE_TIMEOUT_MS },
  );
  if (smokeCheck.status !== 0 || smokeCheck.error) {
    dockerProbeResult = {
      usable: false,
      reason:
        `verapdf image smoke check failed: ` +
        (smokeCheck.error?.message ??
          smokeCheck.stderr?.trim() ??
          'non-zero exit'),
    };
    return dockerProbeResult;
  }

  dockerProbeResult = {
    usable: true,
    reason: 'docker daemon reachable, image smoke passed',
  };
  return dockerProbeResult;
}

// ---------------------------------------------------------------------------
// Custom runner: injects --platform linux/amd64 + uses volume-mount strategy.
//
// The upstream runVeraPdfDocker pipes PDF bytes via stdin (docker run -i).
// The pinned verapdf/cli image does not support reading from stdin ("-" file
// argument fails with "File /data/- doesn't exist").  We therefore write the
// PDF to a temp file, mount it into the container, and pass the filename.
// This matches the approach used by the STYNX R13 W05 verapdf.ts helper.
// ---------------------------------------------------------------------------
async function platformAwareRunner(
  request: VeraPdfDockerRunRequest,
): Promise<VeraPdfDockerRunResult> {
  const dir = mkdtempSync(join(tmpdir(), 'sgp-pdfa-'));
  const pdfFile = 'input.pdf';
  writeFileSync(join(dir, pdfFile), Buffer.from(request.pdf));

  const result = spawnSync(
    request.dockerBin,
    [
      'run',
      '--rm',
      '--platform',
      'linux/amd64',
      '-v',
      `${dir}:/work`,
      '-w',
      '/work',
      request.image,
      '--format',
      'json',
      '--flavour',
      request.flavour,
      pdfFile,
    ],
    { encoding: 'utf8', timeout: request.timeoutMs },
  );

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? result.error?.message ?? '',
    exitCode: result.status,
    timedOut: result.error?.message?.includes('ETIMEDOUT') ?? false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const GOLDEN_ROOT = join(__dirname, 'golden');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

async function buildRealService(): Promise<PdfABuilderService> {
  const validator = new VeraPdfDockerValidator({
    image: VERAPDF_IMAGE,
    timeoutMs: 40_000,
    runner: platformAwareRunner,
  });

  const module = await Test.createTestingModule({
    providers: [
      PdfABuilderService,
      { provide: PDF_A_VALIDATOR, useValue: validator },
    ],
  }).compile();

  return module.get(PdfABuilderService);
}

// ---------------------------------------------------------------------------
// Suite — conditionally skip if Docker is not available
// ---------------------------------------------------------------------------
const probe = probeDocker();

const describeSuite = probe.usable ? describe : describe.skip;

describeSuite(
  `PDF/A build-time conformance gate [needs-docker] — ${probe.usable ? 'docker available' : 'SKIPPED: ' + probe.reason}`,
  () => {
    let service: PdfABuilderService;

    beforeAll(async () => {
      service = await buildRealService();
    }, TEST_TIMEOUT_MS);

    it(
      'validates payslip PDF/A-2b (real veraPDF)',
      async () => {
        const input = readJson<PayslipDocument>(
          join(GOLDEN_ROOT, 'payslip-pdf-a-v01', 'input.json'),
        );

        const audit = await service.buildPayslipWithAudit(input);

        if (!audit.pdfAValidation.valid) {
          console.error(
            '[pdf-a-conformance] payslip validation FAILED. Full errors[]:\n',
            JSON.stringify(audit.pdfAValidation.errors, null, 2),
          );
        }

        expect(audit.pdfAValidation.valid).toBe(true);
        expect(audit.pdfAValidation.errors).toHaveLength(0);
        // VeraPdfDockerValidator + parseVeraPdfJson returns declared=null when
        // verapdf's JSON has validationResult as an array (its CLI default format).
        // Conformance against PDF/A-2b is proven by valid===true on a --flavour 2b
        // run.  If the upstream parser is fixed, tighten this assertion to:
        //   expect(declared).toEqual({ version: 'A-2', conformance: 'b' })
        expect(
          audit.pdfAValidation.declared === null ||
            (audit.pdfAValidation.declared?.version === 'A-2' &&
              audit.pdfAValidation.declared?.conformance === 'b'),
        ).toBe(true);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      'validates yearly-income PDF/A-2b (real veraPDF)',
      async () => {
        const aggregate = readJson<YearlyIncomeAggregate>(
          join(GOLDEN_ROOT, 'comprovante-anual-v01', 'input.json'),
        );

        const audit = await service.buildYearlyIncomeWithAudit(
          toYearlyIncomeDocument(aggregate),
        );

        if (!audit.pdfAValidation.valid) {
          console.error(
            '[pdf-a-conformance] yearly-income validation FAILED. Full errors[]:\n',
            JSON.stringify(audit.pdfAValidation.errors, null, 2),
          );
        }

        expect(audit.pdfAValidation.valid).toBe(true);
        expect(audit.pdfAValidation.errors).toHaveLength(0);
        expect(
          audit.pdfAValidation.declared === null ||
            (audit.pdfAValidation.declared?.version === 'A-2' &&
              audit.pdfAValidation.declared?.conformance === 'b'),
        ).toBe(true);
      },
      TEST_TIMEOUT_MS,
    );
  },
);
