import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function repoPath(relativePath: string): string {
  const fromCurrent = resolve(process.cwd(), relativePath);
  return existsSync(fromCurrent)
    ? fromCurrent
    : resolve(process.cwd(), '..', relativePath);
}

describe('runtime entrypoint contract', () => {
  const runtimeTopology = JSON.parse(
    readFileSync(repoPath('docs/gov/generated/runtime-topology.json'), 'utf8'),
  ) as {
    runtimes: Array<{
      name: string;
      kind: string;
      entry_file?: string;
      required_paths: string[];
    }>;
  };

  it('keeps all backend runtime entrypoints represented in topology', () => {
    expect(runtimeTopology.runtimes.map((runtime) => runtime.name)).toEqual(
      expect.arrayContaining([
        'sgp-core-api',
        'sgp-portal-api',
        'sgp-payroll-engine',
        'sgp-integrations-worker',
        'sgp-report-service',
        'sgp-report-worker',
      ]),
    );

    for (const runtime of runtimeTopology.runtimes.filter(
      (candidate) => candidate.entry_file,
    )) {
      expect(runtime.required_paths).toContain(
        `backend/src/${runtime.entry_file}`,
      );
    }
  });

  it('wires HTTP runtimes to logger, tracing, metrics, helmet, CORS, and rate limiting', () => {
    for (const entrypoint of [
      'backend/src/main.ts',
      'backend/src/main-portal.ts',
      'backend/src/main-payroll-engine.ts',
      'backend/src/main-report-service.ts',
    ]) {
      const source = readFileSync(repoPath(entrypoint), 'utf8');
      expect(source).toContain('usePinoLogger(app)');
      expect(source).toContain('configureOpenTelemetryTracingEntrypoint');
      expect(source).toContain('configurePrometheusMetricsEntrypoint');
      expect(source).toContain('configureRateLimitEntrypoint(app)');
      expect(source).toContain('configureCorsEntrypoint(app)');
      expect(source).toContain('app.use(helmet())');
    }
  });

  it('wires worker runtimes to scheduler, readiness probe, and shutdown handling', () => {
    for (const entrypoint of [
      'backend/src/main-integrations-worker.ts',
      'backend/src/main-report-worker.ts',
    ]) {
      const source = readFileSync(repoPath(entrypoint), 'utf8');
      expect(source).toContain('usePinoLogger(app)');
      expect(source).toContain('WorkerPollSchedulerService');
      expect(source).toContain('startWorkerReadinessProbe');
      expect(source).toContain('registerWorkerShutdown');
      expect(source).toContain('scheduler.runOnce()');
      expect(source).toContain('scheduler.start()');
    }
  });

  it('wires every runtime to the retained pino redaction policy module', () => {
    const runtimeLoggingModules = new Map([
      ['backend/src/app.module.ts', "createLoggingModule('sgp-core-api')"],
      [
        'backend/src/app-portal.module.ts',
        "createLoggingModule('sgp-portal-api')",
      ],
      [
        'backend/src/payroll-engine/payroll-engine.module.ts',
        "createLoggingModule('sgp-payroll-engine')",
      ],
      [
        'backend/src/report-service/report-service.module.ts',
        "createLoggingModule('sgp-report-service')",
      ],
      [
        'backend/src/main-integrations-worker.ts',
        "createLoggingModule('sgp-integrations-worker')",
      ],
      [
        'backend/src/main-report-worker.ts',
        "createLoggingModule('sgp-report-worker')",
      ],
    ]);

    for (const [entrypoint, loggingModuleCall] of runtimeLoggingModules) {
      const source = readFileSync(repoPath(entrypoint), 'utf8');
      expect(source).toContain(loggingModuleCall);
    }
  });
});
