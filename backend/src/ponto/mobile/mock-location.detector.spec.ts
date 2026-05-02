import { MockLocationDetector } from './mock-location.detector';

describe('MockLocationDetector', () => {
  it('blocks Android mock_location=true', () => {
    const detector = new MockLocationDetector();

    const result = detector.detect({
      employeeId: '00000000-0000-4000-8000-000000000101',
      lat: -23.55052,
      lon: -46.633308,
      gpsPrecisionM: 10,
      occurredAt: '2026-05-02T12:00:00.000Z',
      mockLocation: true,
      deviceId: 'device-1',
      platform: 'ANDROID',
    });

    expect(result).toEqual({ blocked: true, result: 'MOCK_DETECTED' });
  });
});
