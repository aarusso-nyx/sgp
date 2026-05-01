import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  const employeeRow = {
    id: 'emp-1',
    registration: 'MAT-001',
    name: 'Servidor',
    cpf: '00011122233',
    email: 'servidor@example.test',
    lifecycle_status: 'ACTIVE',
    functional_status: 'Ativo',
    branch_name: 'Matriz',
    active: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: '2026-01-02T00:00:00.000Z',
  };

  function databaseWithTransaction(rows: unknown[][]) {
    const query = jest.fn();
    for (const row of rows) {
      query.mockResolvedValueOnce({ rows: row });
    }
    return {
      configured: true,
      transaction: (
        callback: (client: { query: jest.Mock }) => Promise<unknown>,
      ) => callback({ query }),
      query,
    };
  }

  it('returns paged employees', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: 'MAT-001',
          name: 'Servidor',
          cpf: null,
          email: null,
          lifecycle_status: 'ACTIVE',
          functional_status: 'Ativo',
          branch_name: 'Matriz',
          active: true,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    const service = new EmployeesService({ configured: true, query } as never);

    const result = await service.list({ page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.registration).toBe('MAT-001');
  });

  it('terminates an employee and creates the termination payroll run', async () => {
    const database = databaseWithTransaction([
      [{ id: 'status-1' }],
      [
        {
          id: 'emp-1',
          registration: 'MAT-001',
          name: 'Servidor',
          cpf: null,
          email: null,
          lifecycle_status: 'TERMINATED',
          functional_status: 'Desligamento',
          branch_name: null,
          branch_id: 'branch-1',
          active: false,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-04-15T00:00:00.000Z'),
        },
      ],
      [],
      [],
      [{ id: 'payroll-type-1' }],
      [{ id: 'processing-type-1' }],
      [{ id: 'run-1', status: 'DRAFT' }],
    ]);
    const service = new EmployeesService(database as never);

    const result = await service.terminate('emp-1', {
      terminationDate: '2026-04-15',
      terminationReasonId: 'reason-1',
      generateTerminationPayroll: true,
    });

    expect(result.employee.lifecycleStatus).toBe('TERMINATED');
    expect(result.payrollRunId).toBe('run-1');
  });

  it('admits an employee and returns the created contract id', async () => {
    const database = databaseWithTransaction([
      [{ id: 'status-1' }],
      [{ id: 'link-1' }],
      [{ id: 'contract-type-1' }],
      [{ ...employeeRow, contract_id: 'contract-1' }],
    ]);
    const service = new EmployeesService(database as never);

    await expect(
      service.admit({
        registration: ' MAT-001 ',
        name: ' Servidor ',
        cpf: ' 00011122233 ',
        email: ' SERVIDOR@EXAMPLE.TEST ',
        hiredOn: '2026-04-01',
        possessionOn: '2026-04-10',
        exerciseOn: '2026-04-15',
      }),
    ).resolves.toMatchObject({
      employeeId: 'emp-1',
      employmentContractId: 'contract-1',
      employee: { registration: 'MAT-001' },
    });
  });

  it('creates, updates, deactivates, and terminates employees without payroll', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([employeeRow])
      .mockResolvedValueOnce([
        { ...employeeRow, lifecycle_status: 'TERMINATED', active: false },
      ])
      .mockResolvedValueOnce([
        { ...employeeRow, lifecycle_status: 'TERMINATED', active: false },
      ]);
    const service = new EmployeesService({ configured: true, query } as never);

    await expect(
      service.create({
        registration: ' MAT-001 ',
        name: ' Servidor ',
        cpf: ' 00011122233 ',
        email: ' SERVIDOR@EXAMPLE.TEST ',
      }),
    ).resolves.toMatchObject({
      cpf: '00011122233',
      email: 'servidor@example.test',
      active: true,
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    await expect(
      service.update('emp-1', {
        registration: ' MAT-001 ',
        name: ' Servidor ',
        active: false,
      }),
    ).resolves.toMatchObject({ lifecycleStatus: 'TERMINATED', active: false });
    await expect(service.deactivate('emp-1')).resolves.toMatchObject({
      lifecycleStatus: 'TERMINATED',
    });
    const terminateService = new EmployeesService(
      databaseWithTransaction([
        [{ id: 'status-1' }],
        [
          {
            ...employeeRow,
            lifecycle_status: 'TERMINATED',
            functional_status: 'Desligamento',
            branch_name: null,
            branch_id: null,
            active: false,
          },
        ],
        [],
        [],
      ]) as never,
    );
    await expect(
      terminateService.terminate('emp-1', {
        terminationDate: '2026-04-15',
        terminationReasonId: 'reason-1',
        justification: ' Justificativa ',
        generateTerminationPayroll: false,
      }),
    ).resolves.toMatchObject({
      payrollRunId: null,
      payrollRunStatus: null,
      employee: { functionalStatus: 'Desligamento' },
    });
  });

  it('handles empty pages and employee mutation failures', async () => {
    await expect(
      new EmployeesService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      } as never).list({ search: 'Servidor' }),
    ).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
    await expect(
      new EmployeesService({ configured: false } as never).list({}),
    ).rejects.toThrow('DATABASE_URL is required');
    await expect(
      new EmployeesService({
        configured: true,
        query: jest.fn().mockRejectedValueOnce({ code: '23505' }),
      } as never).create({ registration: 'MAT-001', name: 'Servidor' }),
    ).rejects.toThrow('already exists');
    await expect(
      new EmployeesService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]),
      } as never).update('missing', {
        registration: 'MAT-001',
        name: 'Servidor',
      }),
    ).rejects.toThrow('Employee not found');
    await expect(
      new EmployeesService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]),
      } as never).deactivate('missing'),
    ).rejects.toThrow('Employee not found');
    await expect(
      new EmployeesService(
        databaseWithTransaction([[{ id: 'status-1' }], []]) as never,
      ).terminate('missing', {
        terminationDate: '2026-04-15',
        terminationReasonId: 'reason-1',
      }),
    ).rejects.toThrow('Employee not found');
  });
});
