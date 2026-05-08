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
});
