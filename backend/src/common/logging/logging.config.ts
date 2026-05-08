import type { DynamicModule } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LoggerModule } from 'nestjs-pino';
import type { Params } from 'nestjs-pino';

export const LOG_REDACTED_VALUE = '[redacted]';

type RedactionPolicy = {
  censor?: string | undefined;
  maxDepth?: number | undefined;
  piiKeys?: string[] | undefined;
  secretPaths?: string[] | undefined;
};

type ResolvedRedactionPolicy = {
  censor: string;
  maxDepth: number;
  piiKeys: string[];
  secretPaths: string[];
};

const DEFAULT_REDACTION_POLICY = {
  censor: LOG_REDACTED_VALUE,
  maxDepth: 5,
  piiKeys: ['cpf', 'pis_pasep', 'bank_account', 'email'],
  secretPaths: [
    'headers.authorization',
    'headers.Authorization',
    'req.headers.authorization',
    'req.headers.Authorization',
    'request.headers.authorization',
    'request.headers.Authorization',
  ],
} satisfies ResolvedRedactionPolicy;

const REDACTION_POLICY_PATH = 'docs/gov/privacy/redactions.json';
const REDACTION_POLICY = loadRedactionPolicy();

export const LOG_REDACTION_POLICY_PATH = REDACTION_POLICY_PATH;

export const LOGGER_REDACT_PATHS = [
  ...createNestedRedactPaths(
    REDACTION_POLICY.piiKeys,
    REDACTION_POLICY.maxDepth,
  ),
  ...createNestedRedactPaths(
    REDACTION_POLICY.secretPaths,
    Math.min(REDACTION_POLICY.maxDepth, 2),
  ),
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
        censor: REDACTION_POLICY.censor,
      },
    },
  };
}

function loadRedactionPolicy(): ResolvedRedactionPolicy {
  const policyPath = repoPath(REDACTION_POLICY_PATH);
  if (!existsSync(policyPath)) return DEFAULT_REDACTION_POLICY;

  const parsed = JSON.parse(
    readFileSync(policyPath, 'utf8'),
  ) as RedactionPolicy;
  return {
    censor:
      typeof parsed.censor === 'string'
        ? parsed.censor
        : DEFAULT_REDACTION_POLICY.censor,
    maxDepth:
      typeof parsed.maxDepth === 'number'
        ? parsed.maxDepth
        : DEFAULT_REDACTION_POLICY.maxDepth,
    piiKeys: normalizeStringArray(
      parsed.piiKeys,
      DEFAULT_REDACTION_POLICY.piiKeys,
    ),
    secretPaths: normalizeStringArray(
      parsed.secretPaths,
      DEFAULT_REDACTION_POLICY.secretPaths,
    ),
  };
}

function repoPath(relativePath: string): string {
  const fromCurrent = resolve(process.cwd(), relativePath);
  if (existsSync(fromCurrent)) return fromCurrent;
  return resolve(process.cwd(), '..', relativePath);
}

function normalizeStringArray(
  values: string[] | undefined,
  fallback: string[],
): string[] {
  const normalized = values?.filter((value) => value.trim().length > 0) ?? [];
  return normalized.length > 0 ? normalized : fallback;
}

function createNestedRedactPaths(keys: string[], maxDepth: number): string[] {
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
