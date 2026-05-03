import type { INestApplication, INestApplicationContext } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

export function usePinoLogger(
  app: INestApplication | INestApplicationContext,
): void {
  app.useLogger(app.get(Logger));
}
