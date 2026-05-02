import { FaceLivenessService } from './liveness.service';

describe('FaceLivenessService', () => {
  it('rejects a static printed-photo fixture and blocks matching', () => {
    const service = new FaceLivenessService();
    const imageBase64 = Buffer.from('printed-photo-static').toString('base64');

    const result = service.verify([
      { imageBase64, blinkDetected: false, yawDegrees: 0 },
      { imageBase64, blinkDetected: false, yawDegrees: 1 },
      { imageBase64, blinkDetected: false, yawDegrees: 0 },
    ]);

    expect(result.passed).toBe(false);
    expect(result.blinkDetected).toBe(false);
    expect(result.headTurnDetected).toBe(false);
  });

  it('accepts blink plus head-turn liveness sequence', () => {
    const service = new FaceLivenessService();
    const imageBase64 = Buffer.from('live-face-sequence').toString('base64');

    expect(
      service.verify([
        { imageBase64, blinkDetected: false, yawDegrees: -12 },
        { imageBase64, blinkDetected: true, yawDegrees: 12 },
      ]).passed,
    ).toBe(true);
  });
});
