import { ConfigService } from '@nestjs/config';

import { AudespStubServerService } from './audesp-stub-server.service';

describe('AudespStubServerService', () => {
  it('returns deterministic success responses', () => {
    const service = new AudespStubServerService(config() as never);

    const response = service.submit(
      envelope('<TipoRemessa>FOLHA_PAGAMENTO</TipoRemessa>'),
    );

    expect(response).toEqual(
      expect.objectContaining({
        accepted: true,
        protocol: expect.stringMatching(/^AUDESP-STUB-/),
        receivedHash: 'abc123',
      }),
    );
  });

  it('returns deterministic reject responses for test flag payloads', () => {
    const service = new AudespStubServerService(config() as never);

    const response = service.submit(
      envelope('<TipoRemessa>STUB_REJECT</TipoRemessa>'),
    );

    expect(response.accepted).toBe(false);
    expect(response.message).toContain('Rejected');
  });
});

function config(): Partial<ConfigService> {
  return { get: jest.fn(() => undefined) };
}

function envelope(body: string) {
  return {
    layoutCode: 'AUDESP-FOLHA',
    layoutVersion: '0.0.1',
    contentType: 'application/xml',
    payloadHash: 'abc123',
    body,
  };
}
