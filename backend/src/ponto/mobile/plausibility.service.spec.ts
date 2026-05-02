import { MobileClockPlausibilityService } from './plausibility.service';

describe('MobileClockPlausibilityService', () => {
  it('blocks two clock-ins 1000 km apart in two minutes', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            recorded_at: '2026-05-02T12:00:00.000Z',
            lat: '-23.550520',
            lon: '-46.633308',
          },
        ],
      }),
    };
    const service = new MobileClockPlausibilityService();

    const result = await service.validateWithClient(client as never, {
      employeeId: '00000000-0000-4000-8000-000000000101',
      lat: -15.793889,
      lon: -47.882778,
      gpsPrecisionM: 15,
      occurredAt: '2026-05-02T12:02:00.000Z',
      mockLocation: false,
      deviceId: 'device-1',
    });

    expect(result).toEqual({
      accepted: false,
      result: 'IMPOSSIBLE_VELOCITY',
    });
  });
});
