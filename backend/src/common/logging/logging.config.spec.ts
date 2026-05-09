import pino from 'pino';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  LOGGER_REDACT_PATHS,
  LOG_REDACTED_VALUE,
  LOG_REDACTION_POLICY_PATH,
  createPinoLoggerParams,
} from './logging.config';

describe('pino logger redaction contract', () => {
  const repoPath = (relativePath: string) => {
    const fromCurrent = resolve(process.cwd(), relativePath);
    return existsSync(fromCurrent)
      ? fromCurrent
      : resolve(process.cwd(), '..', relativePath);
  };

  it('loads redaction keys from the retained governance policy', () => {
    const policy = JSON.parse(
      readFileSync(repoPath(LOG_REDACTION_POLICY_PATH), 'utf8'),
    ) as {
      piiKeys: string[];
      secretPaths: string[];
    };

    expect(policy.piiKeys).toEqual(
      expect.arrayContaining(['cpf_cnpj', 'pisPasep', 'bankAccount']),
    );
    expect(policy.secretPaths).toEqual(
      expect.arrayContaining(['req.headers.authorization']),
    );
    expect(LOGGER_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        'cpf_cnpj',
        '*.pisPasep',
        '*.*.bankAccount',
        'req.headers.authorization',
      ]),
    );
  });

  it('redacts CPF, PIS/PASEP, email, bank account, and authorization headers', () => {
    const output: string[] = [];
    const destination = {
      write: (chunk: string) => {
        output.push(chunk);
      },
    };
    const params = createPinoLoggerParams('sgp-test');
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

    logger.info({
      cpf: '12345678901',
      cpf_cnpj: '12345678901234',
      employee: {
        pisPasep: '12345678901',
        contact: {
          email: 'person@example.test',
          bankAccount: '00012345-6',
          banking: {
            accountNumber: '999888777',
            agencyNumber: '1234',
          },
        },
      },
      req: {
        headers: {
          authorization: 'Bearer lower-case-secret',
          Authorization: 'Bearer secret-token',
        },
      },
    });

    const line = output.join('');
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const serialized = JSON.stringify(parsed);

    expect(serialized).toContain(LOG_REDACTED_VALUE);
    expect(serialized).not.toContain('12345678901');
    expect(serialized).not.toContain('12345678901234');
    expect(serialized).not.toContain('person@example.test');
    expect(serialized).not.toContain('00012345-6');
    expect(serialized).not.toContain('999888777');
    expect(serialized).not.toContain('1234');
    expect(serialized).not.toContain('Bearer lower-case-secret');
    expect(serialized).not.toContain('Bearer secret-token');
  });
});
