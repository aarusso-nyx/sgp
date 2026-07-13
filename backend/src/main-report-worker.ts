import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { startWorkerReadinessProbe } from './common/bootstrap/worker-readiness-probe';
import {
  createWorkerPollSchedulerProviders,
  registerWorkerShutdown,
  WorkerPollSchedulerService,
} from './common/worker-scheduling/worker-poll-scheduler.service';
import { ReportServiceModule } from './report-service/report-service.module';
import { ReportWorkerService } from './report-service/report-worker.service';
import { SgpStynxRuntimeModule } from './stynx/stynx-runtime.module';
import { createSgpStynxWorkerRuntime } from './stynx/stynx-runtime.factory';

@Module({
  imports: [
    SgpStynxRuntimeModule.forRoot({ serviceName: 'sgp-report-worker' }),
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
  const app = await createSgpStynxWorkerRuntime(ReportWorkerRuntimeModule);
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
