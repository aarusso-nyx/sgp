import type { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Params } from 'nestjs-pino';

export const LOG_REDACTED_VALUE = '[redacted]';

const MAX_REDACT_DEPTH = 5;
const PII_REDACT_KEYS = ['cpf', 'pis_pasep', 'bank_account', 'email'] as const;

const AUTHORIZATION_REDACT_PATHS = [
  'headers.authorization',
  'headers.Authorization',
  'req.headers.authorization',
  'req.headers.Authorization',
  'request.headers.authorization',
  'request.headers.Authorization',
  '*.headers.authorization',
  '*.headers.Authorization',
  '*.*.headers.authorization',
  '*.*.headers.Authorization',
] as const;

export const LOGGER_REDACT_PATHS = [
  ...createNestedRedactPaths(PII_REDACT_KEYS, MAX_REDACT_DEPTH),
  ...AUTHORIZATION_REDACT_PATHS,
];

export function createLoggingModule(serviceName: string): DynamicModule {
  return LoggerModule.forRoot(createPinoLoggerParams(serviceName));
}

export function createPinoLoggerParams(serviceName: string): Params {
  return {
    pinoHttp: {
      name: serviceName,
      level: process.env.LOG_LEVEL ?? defaultLogLevel(),
      redact: {
        paths: [...LOGGER_REDACT_PATHS],
        censor: LOG_REDACTED_VALUE,
      },
    },
  };
}

function createNestedRedactPaths(
  keys: readonly string[],
  maxDepth: number,
): string[] {
  const paths: string[] = [];

  for (const key of keys) {
    paths.push(key);
    let prefix = '*';
    for (let depth = 1; depth <= maxDepth; depth += 1) {
      paths.push(`${prefix}.${key}`);
      prefix = `${prefix}.*`;
    }
  }

  return paths;
}

function defaultLogLevel(): string {
  return process.env.NODE_ENV === 'test' ? 'silent' : 'info';
}
