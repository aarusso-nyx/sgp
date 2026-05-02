/* eslint-disable */
import { ForbiddenException } from '@nestjs/common';

import { MobileClockService } from './mobile-clock.service';

const input = {
  employeeId: 'employee-1',
  deviceId: 'device-1',
  occurredAt: '2026-05-02T10:00:00.000Z',
  lat: -23.5,
  lon: -46.6,
  gpsPrecisionM: 10,
  mockLocation: false,
};

describe('MobileClockService', () => {
  it('maps registration, consent, and geofence updates', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'device-reg-1' }])
      .mockResolvedValueOnce([{ id: 'consent-1' }])
      .mockResolvedValueOnce([{ id: 'work-1', geofence_configured: true }]);
    const service = new MobileClockService(
      { configured: true, query } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.registerDevice({
        employeeId: 'employee-1',
        deviceId: ' device-1 ',
        platform: 'ANDROID',
        publicKey: ' key ',
      }),
    ).resolves.toEqual({ id: 'device-reg-1' });
    await expect(
      service.createConsent({
        employeeId: 'employee-1',
        consentVersion: ' v1 ',
      }),
    ).resolves.toEqual({ id: 'consent-1' });
    await expect(
      service.updateGeofence({
        workLocationId: 'work-1',
        polygon: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 1 },
          { lat: 1, lon: 1 },
        ],
      }),
    ).resolves.toEqual({ id: 'work-1', geofence_configured: true });
  });

  it('covers mobile clock decision branches', async () => {
    async function runClock({
      consent = true,
      mockDecision = { blocked: false },
      plausibility = { accepted: true },
      geofence = { inside: true, workLocationId: 'work-1', distanceM: 5 },
      attemptResult = 'ACCEPTED',
    } = {}) {
      const query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 'registered' }] })
        .mockResolvedValueOnce({ rows: [{ exists: consent }] });
      if (attemptResult === 'ACCEPTED') {
        query.mockResolvedValueOnce({ rows: [{ next_nsr: '7' }] });
      }
      query.mockResolvedValueOnce({
        rows: [
          {
            id: `attempt-${attemptResult}`,
            result: attemptResult,
            time_record_id: attemptResult === 'ACCEPTED' ? 'record-1' : null,
            work_location_id: geofence.workLocationId,
          },
        ],
      });
      const client = {
        query,
      };
      const service = new MobileClockService(
        { configured: true, transaction: jest.fn((fn) => fn(client)) } as never,
        { validateWithClient: jest.fn().mockResolvedValue(geofence) } as never,
        {
          validateWithClient: jest.fn().mockResolvedValue(plausibility),
        } as never,
        { detect: jest.fn().mockReturnValue(mockDecision) } as never,
        {
          createWithClient: jest
            .fn()
            .mockResolvedValue({ timeRecordId: 'record-1' }),
        } as never,
      );
      return service.clock(input);
    }

    await expect(runClock()).resolves.toMatchObject({
      result: 'ACCEPTED',
      timeRecordId: 'record-1',
      workLocationId: 'work-1',
      distanceM: 5,
    });
    await expect(
      runClock({ consent: false, attemptResult: 'NO_GEOLOCATION_CONSENT' }),
    ).resolves.toMatchObject({ result: 'NO_GEOLOCATION_CONSENT' });
    await expect(
      runClock({
        mockDecision: { blocked: true, result: 'MOCK_DETECTED' },
        attemptResult: 'MOCK_DETECTED',
      }),
    ).resolves.toMatchObject({ result: 'MOCK_DETECTED' });
    await expect(
      runClock({
        plausibility: { accepted: false, result: 'LOW_PRECISION' },
        attemptResult: 'LOW_PRECISION',
      }),
    ).resolves.toMatchObject({ result: 'LOW_PRECISION' });
    await expect(
      runClock({
        geofence: { inside: false, workLocationId: 'work-1', distanceM: 50 },
        attemptResult: 'OUT_OF_FENCE',
      }),
    ).resolves.toMatchObject({ result: 'OUT_OF_FENCE' });
  });

  it('rejects unregistered devices and defaults consent/nsr branches', async () => {
    const service = new MobileClockService(
      { configured: true } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      (
        service as never as { assertRegisteredDevice: Function }
      ).assertRegisteredDevice(
        { query: jest.fn().mockResolvedValue({ rows: [] }) },
        input,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      (
        service as never as { hasActiveGeolocationConsent: Function }
      ).hasActiveGeolocationConsent(
        { query: jest.fn().mockResolvedValue({ rows: [] }) },
        'employee-1',
      ),
    ).resolves.toBe(false);
    await expect(
      (service as never as { nextNsr: Function }).nextNsr(
        { query: jest.fn().mockResolvedValue({ rows: [] }) },
        'employee-1',
      ),
    ).resolves.toBe(1);
  });
});
