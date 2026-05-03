import { ConfigService } from '@nestjs/config';

import { DctfwebTransmitterService } from './dctfweb-transmitter.service';

const acceptedDeclaration = {
  id: '00000000-0000-4000-8000-00000000f154',
  competence: '2026-01-01',
  kind: 'ORIGINAL' as const,
  status: 'ACCEPTED' as const,
  originalDeclarationId: null,
  payloadXmlRef: 's3://payload.xml',
  payloadXmlHash: 'a'.repeat(64),
  signedXmlRef: 's3://signed.xml',
  signedXml: '<DCTFWeb><declaracao Id="DCTF154" /></DCTFWeb>',
  signedXmlHash: 'b'.repeat(64),
  transmittedXmlHash: 'b'.repeat(64),
  receiptNumber: 'RFB154',
  receiptAt: '2026-05-03T00:00:00.000Z',
  itemCount: 1,
  totalBaseAmount: '1000.00',
  totalAmount: '200.00',
  createdAt: '2026-05-03T00:00:00.000Z',
  updatedAt: '2026-05-03T00:00:00.000Z',
  payloadXml: '<DCTFWeb />',
  items: [],
};

describe('DCTFWeb retransmission idempotency', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deduplicates an accepted declaration when the transmitted XML hash is unchanged', async () => {
    const find = jest.fn(async () => acceptedDeclaration);
    const process = jest.fn();
    const service = new DctfwebTransmitterService(
      { get: jest.fn() } as never as ConfigService,
      { find } as never,
      { process } as never,
    );
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await service.transmit(acceptedDeclaration.id);

    expect(result).toBe(acceptedDeclaration);
    expect(result.transmittedXmlHash).toBe(result.signedXmlHash);
    expect(find).toHaveBeenCalledWith(acceptedDeclaration.id);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(process).not.toHaveBeenCalled();
  });
});
