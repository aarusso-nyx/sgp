import { describe, expect, it } from 'vitest';

import { PortalPublicoInscricao } from './inscricao';

describe('PortalPublicoInscricao', () => {
  it('drives consent, biometrics, navigation, and payment preview state', () => {
    const component = new PortalPublicoInscricao();

    component.acceptConsent();
    component.next();
    component.next();
    component.next();
    component.next();
    component.acceptBiometricConsent();
    component.captureFingerprint();
    component.captureFace();
    component.next();
    component.next();
    component.next();
    component.previous();

    expect(component.form.lgpdConsent).toBe(true);
    expect(component.form.biometricConsent).toBe(true);
    expect(component.form.fingerprintQuality).toBe(0.91);
    expect(component.form.faceQuality).toBe(0.87);
    expect(component.payment.pixQrCode).toContain('PIX');
    expect(component.step).toBe('confirm');
  });

  it('builds the public registration payload with explicit consent version and quota declaration', () => {
    const component = new PortalPublicoInscricao();
    component.form = {
      ...component.form,
      cpf: '52998224725',
      fullName: ' Maria Silva ',
      birthDate: '1990-01-10',
      email: ' maria@example.test ',
      phone: ' 11999999999 ',
      street: ' Rua A ',
      city: ' Sao Paulo ',
      state: ' sp ',
      postalCode: ' 01000-000 ',
      vagaId: '00000000-0000-4000-8000-000000000052',
      education: ' SUPERIOR ',
      professionalRegistry: ' CRM-1 ',
      quota: 'racial',
      exemptionKind: 'CADUNICO',
      exemptionEvidence: ' doc:s3-key ',
      nis: ' 12345678901 ',
      lgpdConsent: true,
    };

    expect(component.canSubmitPublicRegistration()).toBe(true);
    expect(component.buildPublicRegistrationPayload()).toEqual({
      vagaId: '00000000-0000-4000-8000-000000000052',
      candidate: {
        cpf: '52998224725',
        fullName: 'Maria Silva',
        birthDate: '1990-01-10',
        email: 'maria@example.test',
        phone: '11999999999',
        address: {
          street: 'Rua A',
          city: 'Sao Paulo',
          state: 'SP',
          postalCode: '01000-000',
        },
      },
      requirements: {
        education: 'SUPERIOR',
        professionalRegistry: 'CRM-1',
      },
      quotaSelfDeclaration: { racial: true },
      exemption: {
        kind: 'CADUNICO',
        evidenceRef: 'doc:s3-key',
        nis: '12345678901',
      },
      lgpdConsent: true,
      lgpdConsentVersion: 'rec-02-v1',
    });
  });

  it('does not allow public registration submission before LGPD consent', () => {
    const component = new PortalPublicoInscricao();

    expect(component.canSubmitPublicRegistration()).toBe(false);
    expect(component.buildPublicRegistrationPayload()).not.toHaveProperty('quotaSelfDeclaration');
  });

  it('keeps public registration navigation and optional exemption branches bounded', () => {
    const component = new PortalPublicoInscricao();

    component.previous();
    expect(component.step).toBe('personal');

    component.next();
    component.next();
    component.next();
    component.next();
    component.next();
    component.next();
    component.next();
    expect(component.step).toBe('payment');

    component.form = {
      ...component.form,
      cpf: '52998224725',
      fullName: 'Maria Silva',
      birthDate: '1990-01-10',
      email: 'maria@example.test',
      phone: '11999999999',
      street: 'Rua A',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01000-000',
      vagaId: '00000000-0000-4000-8000-000000000052',
      education: 'SUPERIOR',
      professionalRegistry: 'CRM-1',
      quota: '',
      exemptionKind: 'DOADOR_MEDULA',
      exemptionEvidence: '',
      nis: '',
      donorRegistry: ' REDOME-1 ',
      lgpdConsent: true,
    };
    component.lgpdConsentVersion = ' ';
    expect(component.canSubmitPublicRegistration()).toBe(false);

    component.lgpdConsentVersion = 'rec-02-v1';
    const payload = component.buildPublicRegistrationPayload();
    expect(payload).not.toHaveProperty('quotaSelfDeclaration');
    expect(payload.exemption).toEqual({ kind: 'DOADOR_MEDULA', donorRegistry: 'REDOME-1' });
  });
});
