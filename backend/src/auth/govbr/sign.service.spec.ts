import { BadRequestException } from '@nestjs/common';

import { GovBrSignatureSandboxAdapter } from './govbr-signature-sandbox.adapter';
import { GovBrSignService } from './sign.service';

describe('GovBrSignService', () => {
  const actor = {
    sub: 'govbr-sub-1',
    username: 'servidor.portal',
    tenantId: '00000000-0000-0000-0000-000000000100',
    groups: [],
    permissions: ['portal.profile.write'],
    claims: { cpf: '00011122233', email: 'servidor@example.test' },
  };

  it('creates and applies an advanced signature evidence envelope', () => {
    const service = new GovBrSignService(new GovBrSignatureSandboxAdapter());
    const payload = {
      section: 'contato',
      payload: { email: 'novo@example.test' },
      previousPayload: { email: 'antigo@example.test' },
    };

    const initiated = service.initiate(actor, {
      resourceType: 'hr.cadastral_change_request',
      resourceId: 'draft-contato',
      payload,
      returnUrl: '/govbr-sign/callback',
    });
    const callbackUrl = new URL(`http://localhost${initiated.redirectUrl}`);

    const completed = service.complete({
      state: callbackUrl.searchParams.get('state') ?? '',
      decision: 'approved',
      challenge: callbackUrl.searchParams.get('challenge') ?? '',
    });

    expect(completed.request.status).toBe('SIGNED');
    expect(completed.request.signature).toMatchObject({
      legalBasis: 'Lei 14.063/2020 art. 4 II',
      level: 'ADVANCED',
      provider: 'govbr-local-sandbox',
      evidence: {
        uniqueAssociation: true,
        signerControlHighConfidence: true,
        laterModificationDetectable: true,
      },
    });
    expect(service.verifyPayload(payload, completed.request.signature!)).toBe(
      true,
    );
    expect(
      service.verifyPayload(
        { ...payload, payload: { email: 'fraude@example.test' } },
        completed.request.signature!,
      ),
    ).toBe(false);
  });

  it('closes the request without signature evidence when gov.br denies it', () => {
    const service = new GovBrSignService(new GovBrSignatureSandboxAdapter());
    const initiated = service.initiate(actor, {
      resourceType: 'hr.cadastral_change_request',
      payload: { section: 'cadastro' },
    });
    const callbackUrl = new URL(`http://localhost${initiated.redirectUrl}`);

    const completed = service.complete({
      state: callbackUrl.searchParams.get('state') ?? '',
      decision: 'denied',
    });

    expect(completed.request.status).toBe('DENIED');
    expect(completed.request.signature).toBeNull();
    expect(completed.request.evidenceUri).toBeNull();
    expect(completed.redirectUrl).toContain('status=denied');
  });

  it('rejects malformed initiation and callback requests', () => {
    const service = new GovBrSignService(new GovBrSignatureSandboxAdapter());

    expect(() =>
      service.initiate(undefined, {
        resourceType: 'hr.cadastral_change_request',
        payload: {},
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.initiate(actor, {
        resourceType: '',
        payload: {},
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.complete({ state: 'missing', decision: 'approved' }),
    ).toThrow(BadRequestException);
  });
});
