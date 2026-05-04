import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { startWorkerReadinessProbe } from './common/bootstrap/worker-readiness-probe';
import { usePinoLogger } from './common/logging/bootstrap-logger';
import { createLoggingModule } from './common/logging/logging.config';
import {
  createWorkerPollSchedulerProviders,
  registerWorkerShutdown,
  WorkerPollSchedulerService,
} from './common/worker-scheduling/worker-poll-scheduler.service';
import { IntegrationsWorkerModule } from './integrations-worker/integrations-worker.module';
import { IntegrationsWorkerService } from './integrations-worker/integrations-worker.service';

@Module({
  imports: [
    createLoggingModule('sgp-integrations-worker'),
    ScheduleModule.forRoot(),
    IntegrationsWorkerModule,
  ],
  providers: createWorkerPollSchedulerProviders(IntegrationsWorkerService, {
    workerName: 'sgp-integrations-worker',
    pollIntervalEnv: 'INTEGRATIONS_WORKER_POLL_MS',
    pollLimitEnv: 'INTEGRATIONS_WORKER_POLL_LIMIT',
    oneshotEnv: 'INTEGRATIONS_WORKER_ONESHOT',
  }),
})
class IntegrationsWorkerRuntimeModule {}

export async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    IntegrationsWorkerRuntimeModule,
    { bufferLogs: true },
  );
  usePinoLogger(app);
  const scheduler = app.get(WorkerPollSchedulerService);
  const readiness = await startWorkerReadinessProbe({
    workerName: 'sgp-integrations-worker',
    portEnv: 'INTEGRATIONS_WORKER_READY_PORT',
    defaultPort: 3304,
  });

  if (scheduler.oneshot) {
    await scheduler.runOnce();
    await readiness.close();
    await app.close();
    return;
  }

  await scheduler.start();
  registerWorkerShutdown(app, scheduler, () => readiness.close());
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
