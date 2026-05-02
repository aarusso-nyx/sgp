import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { ESocialWorkerModule } from './esocial-worker/esocial-worker.module';
import { ESocialWorkerService } from './esocial-worker/esocial-worker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ESocialWorkerModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('sgp-esocial-worker');
  const worker = app.get(ESocialWorkerService);
  const pollIntervalMs = Number(process.env.ESOCIAL_WORKER_POLL_MS ?? 5000);
  const oneshot = ['1', 'true', 'yes', 'on'].includes(
    (process.env.ESOCIAL_WORKER_ONESHOT ?? '').toLowerCase(),
  );

  const run = async () => {
    const summary = await worker.pollOnce();
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

void bootstrap();
