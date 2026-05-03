import pino from 'pino';

import { LOG_REDACTED_VALUE, createPinoLoggerParams } from './logging.config';

describe('pino logger redaction contract', () => {
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
      employee: {
        pis_pasep: '12345678901',
        contact: {
          email: 'person@example.test',
          bank_account: '00012345-6',
        },
      },
      req: {
        headers: {
          Authorization: 'Bearer secret-token',
        },
      },
    });

    const line = output.join('');
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const serialized = JSON.stringify(parsed);

    expect(serialized).toContain(LOG_REDACTED_VALUE);
    expect(serialized).not.toContain('12345678901');
    expect(serialized).not.toContain('person@example.test');
    expect(serialized).not.toContain('00012345-6');
    expect(serialized).not.toContain('Bearer secret-token');
  });
});
