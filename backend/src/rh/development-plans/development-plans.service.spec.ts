import { BadRequestException, NotFoundException } from '@nestjs/common';

import { DevelopmentPlansService } from './development-plans.service';

describe('DevelopmentPlansService', () => {
  it('lists plans for an employee ordered by period_end desc', async () => {
    const database = {
      configured: true,
      query: jest.fn().mockResolvedValue([
        {
          id: 'pdi-1',
          employee_id: 'emp-1',
          manager_employee_id: 'mgr-1',
          period_start: '2026-01-01',
          period_end: '2026-12-31',
          status: 'ACTIVE',
          objective: 'Crescer em arquitetura.',
          manager_review: '',
          reviewed_at: null,
          created_at: '2026-01-02T10:00:00.000Z',
          updated_at: '2026-01-02T10:00:00.000Z',
        },
      ]),
    };
    const service = new DevelopmentPlansService(database as never);

    await expect(service.listForEmployee('emp-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'pdi-1',
        employeeId: 'emp-1',
        managerEmployeeId: 'mgr-1',
        status: 'ACTIVE',
        objective: 'Crescer em arquitetura.',
      }),
    ]);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM hr.development_plan'),
      ['emp-1'],
    );
  });

  it('rejects an unknown plan status on update', async () => {
    const database = { configured: true, query: jest.fn() };
    const service = new DevelopmentPlansService(database as never);

    await expect(
      service.update('pdi-1', { status: 'NOT_A_STATUS' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFound updating a missing plan', async () => {
    const database = {
      configured: true,
      query: jest.fn().mockResolvedValue([]),
    };
    const service = new DevelopmentPlansService(database as never);

    await expect(
      service.update('pdi-x', { status: 'COMPLETED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adds a goal trimming description text', async () => {
    const database = {
      configured: true,
      query: jest.fn().mockResolvedValue([
        {
          id: 'goal-1',
          development_plan_id: 'pdi-1',
          description: 'Concluir curso NestJS',
          status: 'PENDING',
          due_at: '2026-06-30',
          completed_at: null,
          notes: '',
          created_at: '2026-01-02T10:00:00.000Z',
          updated_at: '2026-01-02T10:00:00.000Z',
        },
      ]),
    };
    const service = new DevelopmentPlansService(database as never);

    await expect(
      service.addGoal('pdi-1', {
        description: '  Concluir curso NestJS  ',
        dueAt: '2026-06-30',
      }),
    ).resolves.toMatchObject({
      id: 'goal-1',
      description: 'Concluir curso NestJS',
      status: 'PENDING',
      dueAt: '2026-06-30',
    });
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.development_plan_goal'),
      expect.arrayContaining(['pdi-1', 'Concluir curso NestJS', '2026-06-30']),
    );
  });

  it('rejects an unknown goal status on update', async () => {
    const database = { configured: true, query: jest.fn() };
    const service = new DevelopmentPlansService(database as never);

    await expect(
      service.updateGoal('goal-1', { status: 'BOGUS' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
