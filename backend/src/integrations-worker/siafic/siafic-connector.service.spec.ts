import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  SiaficConnectorService,
  parseSiaficResponse,
} from './siafic-connector.service';

const payload = {
  idempotencyKey: 'key-1',
  enteCode: '12345678000199',
  payrollRunId: '00000000-0000-4000-8000-000000000001',
  competence: '2025-01-01',
  stage: 'EMPENHO' as const,
  items: [],
};

describe('SiaficConnectorService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses JSON and XML SIAFIC receipts', () => {
    expect(
      parseSiaficResponse(
        JSON.stringify({ status: 'ACEITO', protocolo: 'SIAFIC-123' }),
      ),
    ).toMatchObject({ accepted: true, receiptNumber: 'SIAFIC-123' });
    expect(
      parseSiaficResponse('<retorno><protocolo>XML-9</protocolo></retorno>'),
    ).toMatchObject({ accepted: true, receiptNumber: 'XML-9' });
  });

  it('retries failures before accepting a stage', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accepted: true, receiptNumber: 'OK-1' })),
      );
    global.fetch = fetchMock as typeof fetch;
    const service = new SiaficConnectorService(
      new ConfigService({
        SIAFIC_ENDPOINT_URL: 'http://siafic.example.test/sync',
        SIAFIC_MAX_ATTEMPTS: '2',
        SIAFIC_CIRCUIT_FAILURE_THRESHOLD: '3',
      }),
    );

    await expect(service.sendStage(payload)).resolves.toMatchObject({
      accepted: true,
      receiptNumber: 'OK-1',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(service.getCircuitState(payload.enteCode)).toBe('CLOSED');
  });

  it('opens the per-ente circuit after repeated failures', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('offline')) as typeof fetch;
    const service = new SiaficConnectorService(
      new ConfigService({
        SIAFIC_ENDPOINT_URL: 'http://siafic.example.test/sync',
        SIAFIC_MAX_ATTEMPTS: '2',
        SIAFIC_CIRCUIT_FAILURE_THRESHOLD: '2',
      }),
    );

    await expect(service.sendStage(payload)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(service.getCircuitState(payload.enteCode)).toBe('OPEN');
    await expect(service.sendStage(payload)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
