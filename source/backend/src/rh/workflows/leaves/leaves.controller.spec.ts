import { LeavesController } from './leaves.controller';

describe('LeavesController', () => {
  const service = {
    create: jest.fn(),
    listByEmployee: jest.fn(),
    approve: jest.fn(),
    cancel: jest.fn(),
  };
  const controller = new LeavesController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('routes create requests to the service', () => {
    const body = {
      employeeId: 'employee-1',
      reason: 'maternidade' as const,
      startsOn: '2026-05-01',
    };

    void controller.create(body);

    expect(service.create).toHaveBeenCalledWith(body);
  });

  it('routes approval transitions to the service', () => {
    void controller.approve('leave-1');
    void controller.cancel('leave-2');

    expect(service.approve).toHaveBeenCalledWith('leave-1');
    expect(service.cancel).toHaveBeenCalledWith('leave-2');
  });
});
