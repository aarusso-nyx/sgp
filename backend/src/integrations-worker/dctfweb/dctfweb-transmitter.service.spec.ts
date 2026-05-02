import { ConfigService } from '@nestjs/config';

import {
  DctfwebTransmitterService,
  parseRfbResponse,
} from './dctfweb-transmitter.service';

const signedDeclaration = {
  id: '00000000-0000-4000-8000-00000000f501',
  competence: '2026-01-01',
  kind: 'ORIGINAL' as const,
  status: 'SIGNED' as const,
  originalDeclarationId: null,
  payloadXmlRef: 's3://payload.xml',
  payloadXmlHash: 'a'.repeat(64),
  signedXmlRef: 's3://signed.xml',
  signedXml: '<DCTFWeb><declaracao Id="DCTF1" /></DCTFWeb>',
  signedXmlHash: 'b'.repeat(64),
  transmittedXmlHash: null,
  receiptNumber: null,
  receiptAt: null,
  itemCount: 1,
  totalBaseAmount: '1000.00',
  totalAmount: '200.00',
  createdAt: '2026-05-02T12:00:00.000Z',
  updatedAt: '2026-05-02T12:00:00.000Z',
  payloadXml: '<DCTFWeb />',
  items: [],
};

describe('DctfwebTransmitterService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores a successful RFB response', async () => {
    const service = new DctfwebTransmitterService(
      config({ DCTFWEB_RFB_ENDPOINT_URL: 'http://rfb.test/dctfweb' }),
      declarations(signedDeclaration),
      receiptService('ACCEPTED'),
    );
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ accepted: true, receiptNumber: 'RFB123' }),
    } as Response);

    const result = await service.transmit(signedDeclaration.id);

    expect(result.status).toBe('ACCEPTED');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://rfb.test/dctfweb',
      expect.objectContaining({
        method: 'POST',
        body: signedDeclaration.signedXml,
      }),
    );
  });

  it('stores a rejected RFB response', async () => {
    const service = new DctfwebTransmitterService(
      config({ DCTFWEB_RFB_ENDPOINT_URL: 'http://rfb.test/dctfweb' }),
      declarations(signedDeclaration),
      receiptService('REJECTED'),
    );
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'rejected',
    } as Response);

    const result = await service.transmit(signedDeclaration.id);

    expect(result.status).toBe('REJECTED');
  });

  it('retries timeout failures', async () => {
    const service = new DctfwebTransmitterService(
      config({
        DCTFWEB_RFB_ENDPOINT_URL: 'http://rfb.test/dctfweb',
        DCTFWEB_RFB_MAX_ATTEMPTS: '2',
        DCTFWEB_RFB_TIMEOUT_MS: '1000',
      }),
      declarations(signedDeclaration),
      receiptService('ACCEPTED'),
    );
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ accepted: true, receiptNumber: 'RFB124' }),
      } as Response);

    const result = await service.transmit(signedDeclaration.id);

    expect(result.status).toBe('ACCEPTED');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('parseRfbResponse', () => {
  it('parses XML receipt bodies', () => {
    expect(
      parseRfbResponse('<retorno><numeroRecibo>REC1</numeroRecibo></retorno>'),
    ).toEqual(
      expect.objectContaining({ accepted: true, receiptNumber: 'REC1' }),
    );
  });
});

function config(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

function declarations(result: typeof signedDeclaration) {
  return {
    find: jest.fn(async () => result),
  } as never;
}

function receiptService(status: 'ACCEPTED' | 'REJECTED') {
  return {
    process: jest.fn(async (input) => ({
      ...signedDeclaration,
      status,
      receiptNumber: input.receiptNumber,
    })),
  } as never;
}
