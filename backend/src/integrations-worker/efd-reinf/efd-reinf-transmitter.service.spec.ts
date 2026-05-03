import { ConfigService } from '@nestjs/config';

import {
  EfdReinfTransmitterService,
  parseEfdReinfRfbResponse,
} from './efd-reinf-transmitter.service';

const signedEvent = {
  id: '00000000-0000-4000-8000-000000004099',
  competence: '2025-01-01',
  eventType: 'R4099' as const,
  kind: 'ORIGINAL' as const,
  status: 'SIGNED' as const,
  originalEventId: null,
  payloadXmlRef: 's3://payload.xml',
  payloadXmlHash: 'a'.repeat(64),
  signedXmlRef: 's3://signed.xml',
  signedXml: '<Reinf><evtFech Id="IDR4099" /></Reinf>',
  signedXmlHash: 'b'.repeat(64),
  transmittedXmlHash: null,
  receiptNumber: null,
  receiptAt: null,
  itemCount: 1,
  totalGrossAmount: '1000.00',
  totalRetainedAmount: '100.00',
  createdAt: '2026-05-02T12:00:00.000Z',
  updatedAt: '2026-05-02T12:00:00.000Z',
  payloadXml: '<Reinf />',
  items: [],
};

describe('EfdReinfTransmitterService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores a successful RFB response', async () => {
    const service = new EfdReinfTransmitterService(
      config({ EFD_REINF_RFB_ENDPOINT_URL: 'http://rfb.test/reinf' }),
      events(signedEvent),
      receiptService('ACCEPTED'),
    );
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ accepted: true, receiptNumber: 'REINF123' }),
    } as Response);

    const result = await service.transmit(signedEvent.id);

    expect(result.status).toBe('ACCEPTED');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://rfb.test/reinf',
      expect.objectContaining({
        method: 'POST',
        body: signedEvent.signedXml,
      }),
    );
  });

  it('uses the local sandbox when no endpoint is configured', async () => {
    const service = new EfdReinfTransmitterService(
      config({}),
      events(signedEvent),
      receiptService('ACCEPTED'),
    );

    const result = await service.transmit(signedEvent.id);

    expect(result.receiptNumber).toBe('REINF-R4099-00000000');
  });

  it('retries transient failures', async () => {
    const service = new EfdReinfTransmitterService(
      config({
        EFD_REINF_RFB_ENDPOINT_URL: 'http://rfb.test/reinf',
        EFD_REINF_RFB_MAX_ATTEMPTS: '2',
        EFD_REINF_RFB_TIMEOUT_MS: '1000',
      }),
      events(signedEvent),
      receiptService('ACCEPTED'),
    );
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ accepted: true, receiptNumber: 'REINF124' }),
      } as Response);

    const result = await service.transmit(signedEvent.id);

    expect(result.status).toBe('ACCEPTED');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('parseEfdReinfRfbResponse', () => {
  it('parses XML receipt bodies', () => {
    expect(
      parseEfdReinfRfbResponse(
        '<retorno><nrRecibo>REINF-REC1</nrRecibo></retorno>',
      ),
    ).toEqual(
      expect.objectContaining({ accepted: true, receiptNumber: 'REINF-REC1' }),
    );
  });
});

function config(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

function events(result: typeof signedEvent) {
  return {
    find: jest.fn(async () => result),
  } as never;
}

function receiptService(status: 'ACCEPTED' | 'REJECTED') {
  return {
    process: jest.fn(async (input) => ({
      ...signedEvent,
      status,
      receiptNumber: input.receiptNumber,
    })),
  } as never;
}
