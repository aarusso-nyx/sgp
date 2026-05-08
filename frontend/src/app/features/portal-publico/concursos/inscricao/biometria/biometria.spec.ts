import { describe, expect, it } from 'vitest';

import { PortalPublicoBiometria } from './biometria';

describe('PortalPublicoBiometria', () => {
  it('records biometric consent and capture state', () => {
    const component = new PortalPublicoBiometria();

    component.acceptConsent();
    component.simulateFingerprintCapture();
    component.simulateFaceCapture();
    component.requestDeletion();

    expect(component.consentAccepted).toBe(true);
    expect(component.fingerprintQuality).toBeGreaterThan(0);
    expect(component.faceQuality).toBeGreaterThan(0);
    expect(component.deletionRequested).toBe(true);
  });
});
