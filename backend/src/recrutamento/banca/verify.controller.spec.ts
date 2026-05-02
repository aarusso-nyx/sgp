import { Test } from '@nestjs/testing';

import { PublicBancaVerifyController } from './banca.controller';
import { DocumentSigningService } from './document-signing.service';

describe('PublicBancaVerifyController', () => {
  it('returns public metadata without personal identifiers', async () => {
    const controller = (
      await Test.createTestingModule({
        controllers: [PublicBancaVerifyController],
        providers: [
          {
            provide: DocumentSigningService,
            useValue: {
              publicVerify: jest.fn(async () => ({
                token: 'public-token',
                kind: 'GABARITO',
                format: 'PADES',
                contentHash: 'a'.repeat(64),
                status: 'PUBLISHED',
                valid: true,
                signers: [
                  {
                    name: 'Presidente da Banca',
                    role: 'PRESIDENTE',
                    certKind: 'ICP_A1',
                    signedAt: '2026-05-02T12:00:00.000Z',
                    chainStatus: 'VALID',
                  },
                ],
              })),
            },
          },
        ],
      }).compile()
    ).get(PublicBancaVerifyController);

    const response = await controller.verify('public-token');

    expect(response.valid).toBe(true);
    expect(JSON.stringify(response)).not.toContain('cpf');
    expect(JSON.stringify(response)).not.toContain('privateKey');
  });
});
