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
import { ReportServiceModule } from './report-service/report-service.module';
import { ReportWorkerService } from './report-service/report-worker.service';

@Module({
  imports: [
    createLoggingModule('sgp-report-worker'),
    ScheduleModule.forRoot(),
    ReportServiceModule,
  ],
  providers: createWorkerPollSchedulerProviders(ReportWorkerService, {
    workerName: 'sgp-report-worker',
    pollIntervalEnv: 'REPORT_WORKER_POLL_MS',
    pollLimitEnv: 'REPORT_WORKER_POLL_LIMIT',
    oneshotEnv: 'REPORT_WORKER_ONESHOT',
  }),
})
class ReportWorkerRuntimeModule {}

export async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    ReportWorkerRuntimeModule,
    { bufferLogs: true },
  );
  usePinoLogger(app);
  const scheduler = app.get(WorkerPollSchedulerService);
  const readiness = await startWorkerReadinessProbe({
    workerName: 'sgp-report-worker',
    portEnv: 'REPORT_WORKER_READY_PORT',
    defaultPort: 3306,
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
