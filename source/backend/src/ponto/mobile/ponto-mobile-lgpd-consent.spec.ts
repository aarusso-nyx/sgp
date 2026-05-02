import { MobileClockService } from './mobile-clock.service';

describe('PONTO-09 mobile geolocation LGPD consent', () => {
  it('rejects mobile clock-in without active geolocation consent', async () => {
    const client = {
      query: jest.fn((sql: string) => {
        if (sql.includes('FROM ponto.mobile_device_registration')) {
          return Promise.resolve({ rows: [{ id: 'device-registration-1' }] });
        }
        if (sql.includes('FROM ponto.mobile_geolocation_consent')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (sql.includes('INSERT INTO ponto.mobile_clock_in_attempt')) {
          return Promise.resolve({
            rows: [
              {
                id: 'attempt-1',
                result: 'NO_GEOLOCATION_CONSENT',
                time_record_id: null,
                work_location_id: '00000000-0000-4000-8000-000000000010',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    const database = {
      configured: true,
      transaction: jest.fn(<T>(callback: (value: typeof client) => T) =>
        callback(client),
      ),
    };
    const service = new MobileClockService(
      database as never,
      {
        validateWithClient: jest.fn().mockResolvedValue({
          workLocationId: '00000000-0000-4000-8000-000000000010',
          inside: true,
          distanceM: 0,
        }),
      } as never,
      { validateWithClient: jest.fn() } as never,
      { detect: jest.fn().mockReturnValue({ blocked: false }) } as never,
      { createWithClient: jest.fn() } as never,
    );

    const result = await service.clock({
      employeeId: '00000000-0000-4000-8000-000000000101',
      lat: -23.55052,
      lon: -46.633308,
      gpsPrecisionM: 10,
      occurredAt: '2026-05-02T12:00:00.000Z',
      mockLocation: false,
      deviceId: 'device-1',
    });

    expect(result.result).toBe('NO_GEOLOCATION_CONSENT');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ponto.mobile_clock_in_attempt'),
      expect.arrayContaining(['NO_GEOLOCATION_CONSENT']),
    );
  });
});
