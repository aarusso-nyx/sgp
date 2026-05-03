import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { usePinoLogger } from './common/logging/bootstrap-logger';
import { createLoggingModule } from './common/logging/logging.config';
import { ESocialWorkerModule } from './esocial-worker/esocial-worker.module';
import { ESocialWorkerService } from './esocial-worker/esocial-worker.service';

@Module({
  imports: [createLoggingModule('sgp-esocial-worker'), ESocialWorkerModule],
})
class ESocialWorkerRuntimeModule {}

export async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    ESocialWorkerRuntimeModule,
    { bufferLogs: true },
  );
  usePinoLogger(app);
  const logger = new Logger('sgp-esocial-worker');
  const worker = app.get(ESocialWorkerService);
  const pollIntervalMs = Number(process.env.ESOCIAL_WORKER_POLL_MS ?? 5000);
  const pollLimit = Number(process.env.ESOCIAL_WORKER_POLL_LIMIT ?? 10);
  const oneshot = ['1', 'true', 'yes', 'on'].includes(
    (process.env.ESOCIAL_WORKER_ONESHOT ?? '').toLowerCase(),
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
