import { GeofenceValidatorService } from './geofence-validator.service';

describe('GeofenceValidatorService', () => {
  const database = { configured: true };

  it('returns inside true when PostGIS ST_Within accepts the point', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            work_location_id: '00000000-0000-4000-8000-000000000010',
            inside: true,
            center_lat: '-23.550520',
            center_lon: '-46.633308',
            distance_m: '12.5',
          },
        ],
      }),
    };
    const service = new GeofenceValidatorService(database as never);

    const result = await service.validateWithClient(client as never, {
      employeeId: '00000000-0000-4000-8000-000000000101',
      lat: -23.55052,
      lon: -46.633308,
    });

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('postgis.ST_Within'),
      ['00000000-0000-4000-8000-000000000101', -46.633308, -23.55052],
    );
    expect(result.inside).toBe(true);
    expect(result.workLocationId).toBe('00000000-0000-4000-8000-000000000010');
  });

  it('returns inside false for an outside point', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            work_location_id: '00000000-0000-4000-8000-000000000010',
            inside: false,
            center_lat: '-23.550520',
            center_lon: '-46.633308',
            distance_m: '1400',
          },
        ],
      }),
    };
    const service = new GeofenceValidatorService(database as never);

    const result = await service.validateWithClient(client as never, {
      employeeId: '00000000-0000-4000-8000-000000000101',
      lat: -23.56,
      lon: -46.65,
    });

    expect(result.inside).toBe(false);
    expect(result.distanceM).toBe(1400);
  });
});
