import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('serves liveness from HealthService', () => {
    const health = jest.fn().mockReturnValue({
      ok: true,
      service: 'sgp-core-api',
      timestamp: '2026-05-02T00:00:00.000Z',
    });
    const controller = new HealthController({
      health,
    } as unknown as HealthService);

    expect(controller.health()).toEqual({
      ok: true,
      service: 'sgp-core-api',
      timestamp: '2026-05-02T00:00:00.000Z',
    });
    expect(health).toHaveBeenCalledTimes(1);
  });

  it('serves readiness with config health details', () => {
    const readiness = jest.fn().mockReturnValue({
      ok: true,
      service: 'sgp-core-api',
      checks: { config: { ok: true } },
    });
    const controller = new HealthController({
      readiness,
    } as unknown as HealthService);

    expect(controller.readiness()).toEqual({
      ok: true,
      service: 'sgp-core-api',
      checks: { config: { ok: true } },
    });
    expect(readiness).toHaveBeenCalledTimes(1);
  });
});
