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

  it('wires HTTP runtimes through the shared STYNX runtime factory', () => {
    for (const entrypoint of [
      'backend/src/main.ts',
      'backend/src/main-portal.ts',
      'backend/src/main-payroll-engine.ts',
      'backend/src/main-report-service.ts',
    ]) {
      const source = readFileSync(repoPath(entrypoint), 'utf8');
      expect(source).toContain('createSgpStynxHttpRuntime');
    }

    const factory = readFileSync(
      repoPath('backend/src/stynx/stynx-runtime.factory.ts'),
      'utf8',
    );
    expect(factory).toContain('app.useLogger(app.get(StynxLogger))');
    expect(factory).toContain('configureOpenTelemetryTracingEntrypoint');
    expect(factory).toContain('configurePrometheusMetricsEntrypoint');
    expect(factory).toContain('configureRateLimitEntrypoint(app)');
    expect(factory).toContain('configureCorsEntrypoint(app)');
    expect(factory).toContain('app.use(helmet())');
  });

  it('wires worker runtimes to scheduler, readiness probe, and shutdown handling', () => {
    for (const entrypoint of [
      'backend/src/main-integrations-worker.ts',
      'backend/src/main-report-worker.ts',
    ]) {
      const source = readFileSync(repoPath(entrypoint), 'utf8');
      expect(source).toContain('createSgpStynxWorkerRuntime');
      expect(source).toContain('WorkerPollSchedulerService');
      expect(source).toContain('startWorkerReadinessProbe');
      expect(source).toContain('registerWorkerShutdown');
      expect(source).toContain('scheduler.runOnce()');
      expect(source).toContain('scheduler.start()');
    }
  });

  it('mounts STYNX core, logging, health, and platform pipeline only in the adapter layer', () => {
    const composition = readFileSync(
      repoPath('backend/src/stynx/stynx-runtime.module.ts'),
      'utf8',
    );
    expect(composition).toContain('StynxLoggingModule.forRoot');
    expect(composition).toContain('StynxHealthModule.forRoot');
    expect(composition).toContain('StynxPlatformPipelineModule.forRoot');
    expect(composition).toContain('rateLimit: false');
    expect(composition).toContain('sla: false');
    expect(composition).toContain('idempotency: false');

    for (const entrypoint of [
      'backend/src/main.ts',
      'backend/src/main-portal.ts',
      'backend/src/main-payroll-engine.ts',
      'backend/src/main-integrations-worker.ts',
      'backend/src/main-report-service.ts',
      'backend/src/main-report-worker.ts',
    ]) {
      expect(readFileSync(repoPath(entrypoint), 'utf8')).not.toContain(
        'StynxPlatformPipelineModule',
      );
    }
  });

  it('uses only the shared STYNX logging composition at runtime', () => {
    for (const entrypoint of [
      'backend/src/app.module.ts',
      'backend/src/app-portal.module.ts',
      'backend/src/payroll-engine/payroll-engine.module.ts',
      'backend/src/report-service/report-service.module.ts',
      'backend/src/main-integrations-worker.ts',
      'backend/src/main-report-worker.ts',
    ]) {
      expect(readFileSync(repoPath(entrypoint), 'utf8')).not.toContain(
        'createLoggingModule',
      );
    }
  });
});
