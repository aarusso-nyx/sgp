import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { ReportServiceModule } from './report-service/report-service.module';
import { ReportWorkerService } from './report-service/report-worker.service';

export async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ReportServiceModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('sgp-report-worker');
  const worker = app.get(ReportWorkerService);
  const pollIntervalMs = Number(process.env.REPORT_WORKER_POLL_MS ?? 5000);
  const pollLimit = Number(process.env.REPORT_WORKER_POLL_LIMIT ?? 10);
  const oneshot = ['1', 'true', 'yes', 'on'].includes(
    (process.env.REPORT_WORKER_ONESHOT ?? '').toLowerCase(),
  );

  const run = async () => {
    const backpressure = await worker.backpressureStatus(pollLimit);
    if (backpressure.skipped) {
      logger.warn(
        `poll skipped: queueDepth=${backpressure.queueDepth} activeClaims=${backpressure.activeClaims} capacity=${backpressure.capacity}`,
      );
      return;
    }

    const summary = await worker.pollOnce(backpressure.limit);
    logger.log(
      `poll complete: discovered=${summary.discovered} processed=${summary.processed} failed=${summary.failed} skipped=${summary.skipped}`,
    );
  };

  if (oneshot) {
    await run();
    await app.close();
    return;
  }

  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    void (async () => {
      try {
        await run();
      } catch (error) {
        const message =
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error);
        logger.error(message);
      } finally {
        running = false;
      }
    })();
  }, pollIntervalMs);

  timer.unref();
  await run();

  const shutdown = async () => {
    clearInterval(timer);
    await app.close();
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
