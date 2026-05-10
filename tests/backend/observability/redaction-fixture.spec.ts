import pino from 'pino';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  LOG_REDACTED_VALUE,
  LOG_REDACTION_POLICY_PATH,
  createPinoLoggerParams,
} from '../../../backend/src/common/logging/logging.config';

type RedactionPolicy = {
  piiKeys: string[];
  secretPaths: string[];
};

type RedactionFixture = {
  piiValues: Record<string, string>;
  secretValues: Record<string, string>;
};

describe('runtime redaction fixture coverage', () => {
  it('keeps the retained redaction policy covered by the serialized-log fixture', () => {
    const policy = readJson<RedactionPolicy>(LOG_REDACTION_POLICY_PATH);
    const fixture = readJson<RedactionFixture>(
      'tests/fixtures/observability/pii-fixture.json',
    );

    expect(Object.keys(fixture.piiValues).sort()).toEqual(
      [...policy.piiKeys].sort(),
    );
    expect(Object.keys(fixture.secretValues).sort()).toEqual(
      [...policy.secretPaths].sort(),
    );

    const payload: Record<string, unknown> = {
      nested: { employee: {} },
    };

    for (const [key, value] of Object.entries(fixture.piiValues)) {
      payload[key] = value;
      (payload.nested as { employee: Record<string, string> }).employee[key] =
        `nested-${value}`;
    }

    for (const [path, value] of Object.entries(fixture.secretValues)) {
      assignPath(payload, path, value);
    }

    const line = writeLog(payload);
    expect(line).toContain(LOG_REDACTED_VALUE);

    for (const value of Object.values(fixture.piiValues)) {
      expect(line).not.toContain(value);
      expect(line).not.toContain(`nested-${value}`);
    }

    for (const value of Object.values(fixture.secretValues)) {
      expect(line).not.toContain(value);
    }
  });
});

function writeLog(payload: Record<string, unknown>): string {
  const output: string[] = [];
  const destination = {
    write: (chunk: string) => {
      output.push(chunk);
    },
  };
  const params = createPinoLoggerParams('sgp-redaction-fixture');
  const pinoHttp =
    typeof params.pinoHttp === 'object' && !Array.isArray(params.pinoHttp)
      ? params.pinoHttp
      : undefined;
  const logger = pino(
    {
      ...pinoHttp,
      level: 'info',
    },
    destination,
  );

  logger.info(payload);

  return output.join('');
}

function assignPath(
  target: Record<string, unknown>,
  path: string,
  value: string,
) {
  const segments = path.split('.');
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (!isRecord(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}

function readJson<T>(relativePath: string): T {
  const fromRoot = resolve(process.cwd(), relativePath);
  const path = existsSync(fromRoot)
    ? fromRoot
    : resolve(process.cwd(), '..', relativePath);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
