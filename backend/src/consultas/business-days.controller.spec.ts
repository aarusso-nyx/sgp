import { BusinessDaysController } from './business-days.controller';

describe('BusinessDaysController', () => {
  it('routes working-day queries to the service', async () => {
    const service = {
      getWorkingDays: jest.fn().mockResolvedValue({ workingDays: 4 }),
    };
    const controller = new BusinessDaysController(service as never);

    await expect(
      controller.getWorkingDays({
        startDate: '2026-01-19',
        endDate: '2026-01-25',
      }),
    ).resolves.toEqual({ workingDays: 4 });
    expect(service.getWorkingDays).toHaveBeenCalledWith({
      startDate: '2026-01-19',
      endDate: '2026-01-25',
    });
  });
});
