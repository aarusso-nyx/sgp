import { RhWorkflowsService } from './rh-workflows.service';

describe('RhWorkflowsService', () => {
  const employeeId = '11111111-1111-4111-8111-111111111111';
  const relatedId = '22222222-2222-4222-8222-222222222222';
  const workflowRow = {
    id: '33333333-3333-4333-8333-333333333333',
    employee_id: employeeId,
    employee_registration: 'MAT-1',
    employee_name: 'Servidor',
    title: 'Titulo',
    subtitle: 'Subtitulo',
    starts_on: '2026-01-01',
    ends_on: '2026-01-10',
    status: 'ACTIVE',
    metadata: { source: 'spec' },
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: '2026-01-02T00:00:00.000Z',
  };

  const mutation = {
    employeeId,
    name: ' Dependente ',
    cpf: ' 12345678901 ',
    relationship: 'Filho',
    incomeTaxDependent: true,
    employer: 'Empresa',
    roleTitle: 'Analista',
    startsOn: '2026-01-01',
    endsOn: '2026-01-10',
    functionalStatusId: relatedId,
    reasonId: relatedId,
    year: 2026,
    month: 4,
    absenceDays: '1',
    workedDays: '20',
    source: 'RPPS',
    daysCount: 10,
    effectiveOn: '2026-02-01',
    salaryReferenceId: relatedId,
    levelCode: 'L1',
    levelDescription: 'Nivel 1',
    adjustmentAmount: '123.45',
    rg: 'RG-1',
    rgIssuer: 'SSP',
    pisPasep: 'PIS',
    voterRegistration: 'TITULO',
    vacationTypeId: relatedId,
    days: 10,
    absenceReasonId: relatedId,
    dependentId: relatedId,
    benefitCode: 'BEN',
    unionId: relatedId,
    deductionAmount: '10',
    deductionPercent: '2.5',
    toBranchId: relatedId,
    fromBranchId: relatedId,
    toWorkLocationId: relatedId,
    jobFunctionId: relatedId,
    beneficiaryName: 'Beneficiario',
    beneficiaryCpf: '10987654321',
    courtProcessNumber: 'PROC-1',
    amount: '250.00',
    transitBenefitId: relatedId,
    quantity: '44',
    processNumber: '001/2026',
    subject: 'Revisao funcional',
    processId: relatedId,
    notes: 'Observacao',
    metadata: {
      birthDate: '2010-01-01',
      accrualStartOn: '2025-01-01',
      accrualEndOn: '2025-12-31',
      address: { street: 'Rua A' },
      emergencyContact: { name: 'Contato' },
      code: 'ORG-1',
      branchId: relatedId,
      parentId: relatedId,
    },
  };

  const createQuery = () =>
    jest.fn(async (sql: string) => {
      if (sql.includes('daterange(')) {
        return [{ total: '0' }];
      }
      if (sql.includes('count(*)::text AS total')) {
        return [{ total: '1' }];
      }
      if (sql.includes('SELECT id::text, code::text')) {
        return [{ id: relatedId, code: 'CODE', name: 'Lookup', metadata: {} }];
      }
      if (sql.includes('SELECT employee_id::text AS id')) {
        return [{ id: employeeId }];
      }
      if (sql.includes('INSERT INTO hr.functional_status')) {
        return [{ id: relatedId }];
      }
      if (sql.includes('report_request')) {
        return [
          {
            id: 'request-1',
            status: 'REQUESTED',
            requested_at: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      if (sql.includes('SELECT * FROM (SELECT')) {
        return [workflowRow];
      }
      if (sql.includes(' AS employee_registration')) {
        return [workflowRow];
      }
      return [];
    });

  it('returns mapped workflow definitions', () => {
    const service = new RhWorkflowsService({ configured: true } as never);

    const definitions = service.listDefinitions();

    expect(definitions.map((definition) => definition.key)).toContain(
      'dependents',
    );
    expect(definitions.map((definition) => definition.key)).toContain(
      'vacations',
    );
    expect(definitions.map((definition) => definition.key)).toContain(
      'processes',
    );
  });

  it('lists paged workflow records', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'dep-1',
          employee_id: 'emp-1',
          employee_registration: 'MAT-1',
          employee_name: 'Servidor',
          title: 'Dependente',
          subtitle: 'Filho',
          starts_on: null,
          ends_on: null,
          status: 'ACTIVE',
          metadata: { relationship: 'Filho' },
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    const service = new RhWorkflowsService({
      configured: true,
      query,
    } as never);

    const result = await service.listWorkflow('dependents', {
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.['employeeRegistration']).toBe('MAT-1');
  });

  it('creates import requests as report requests', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'req-1',
        status: 'REQUESTED',
        requested_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    const service = new RhWorkflowsService({
      configured: true,
      query,
    } as never);

    const result = await service.createImportRequest('frequencies', {
      year: 2026,
      month: 4,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('report_request'),
      [
        'RH_IMPORT_FREQUENCIES',
        'Importacao RH - frequencies',
        'PROCESS request generated by RH workflow',
        2026,
        4,
        expect.any(String),
      ],
    );
    expect(result.id).toBe('req-1');
  });

  it('creates administrative process workflow records', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'process-1',
          employee_id: null,
          employee_registration: null,
          employee_name: null,
          title: '001/2026',
          subtitle: 'Revisao funcional',
          starts_on: new Date('2026-04-25'),
          ends_on: null,
          status: 'ACTIVE',
          metadata: {
            processNumber: '001/2026',
            subject: 'Revisao funcional',
          },
          created_at: new Date('2026-04-25T00:00:00.000Z'),
          updated_at: new Date('2026-04-25T00:00:00.000Z'),
        },
      ]);
    const service = new RhWorkflowsService({
      configured: true,
      query,
    } as never);

    const result = await service.createWorkflowRecord('processes', {
      processNumber: '001/2026',
      subject: 'Revisao funcional',
      startsOn: '2026-04-25',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO hr.administrative_process'),
      ['001/2026', 'Revisao funcional', '2026-04-25', '', ''],
    );
    expect(result['title']).toBe('001/2026');
  });

  it('exercises every workflow list, mutation, update, and delete path', async () => {
    const query = createQuery();
    const service = new RhWorkflowsService({
      configured: true,
      query,
    } as never);

    for (const definition of service.listDefinitions()) {
      const list = await service.listWorkflow(
        definition.key,
        { page: 1, pageSize: 2, search: 'Servidor' },
        definition.employeeScoped ? employeeId : undefined,
      );
      const input = { ...mutation };
      if (!definition.employeeScoped) {
        delete input.employeeId;
      }

      const created = await service.createWorkflowRecord(
        definition.key,
        input,
        definition.employeeScoped ? employeeId : undefined,
      );
      const updated = await service.updateWorkflowRecord(
        definition.key,
        workflowRow.id,
        input,
      );
      const deleted = await service.deleteWorkflowRecord(
        definition.key,
        workflowRow.id,
      );

      expect(list.items[0]?.['workflow']).toBe(definition.key);
      expect(created['workflow']).toBe(definition.key);
      expect(updated['workflow']).toBe(definition.key);
      expect(deleted['workflow']).toBe(definition.key);
    }

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.leave_record'),
      expect.any(Array),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE hr.employee'),
      expect.any(Array),
    );
  });

  it('lists lookups, creates reports, and rejects invalid workflow access', async () => {
    const query = createQuery();
    const service = new RhWorkflowsService({
      configured: true,
      query,
    } as never);

    const lookup = await service.listLookup('branches', {
      page: 1,
      pageSize: 5,
      search: 'orgao',
    });
    const report = await service.createReportRequest('frequencies', {
      year: 2026,
      month: 4,
      employeeId,
      sourceFileName: 'frequency.csv',
      parameters: { mode: 'summary' },
    });

    expect(lookup.items[0]?.name).toBe('Lookup');
    expect(report.requestedAt).toBe('2026-01-01T00:00:00.000Z');
    await expect(service.listLookup('unknown', {})).rejects.toThrow(
      'Lookup not found',
    );
    await expect(
      service.listWorkflow('processes', {}, employeeId),
    ).rejects.toThrow('Workflow is not employee scoped');
    await expect(
      service.createWorkflowRecord('dependents', {}),
    ).rejects.toThrow('employeeId is required');
    await expect(
      new RhWorkflowsService({ configured: false } as never).listWorkflow(
        'dependents',
        {},
      ),
    ).rejects.toThrow('DATABASE_URL is required');
  });

  it('applies workflow defaults when optional mutation fields are omitted', async () => {
    const query = createQuery();
    const service = new RhWorkflowsService({
      configured: true,
      query,
    } as never);
    const minimalInputs: Record<string, Record<string, unknown>> = {
      dependents: { name: 'Dependente' },
      'professional-experiences': { employer: 'Empresa' },
      'status-history': {
        functionalStatusId: relatedId,
        startsOn: '2026-01-01',
      },
      frequencies: { year: 2026 },
      'service-time': { source: 'RPPS', startsOn: '2026-01-01' },
      transfers: { effectiveOn: '2026-01-01' },
      'salary-history': { effectiveOn: '2026-01-01' },
      'complement-data': {},
      vacations: { startsOn: '2026-01-01', endsOn: '2026-01-10' },
      leaves: { startsOn: '2026-01-01' },
      'benefit-dependents': {
        name: 'Dependente',
        benefitCode: 'BEN',
        startsOn: '2026-01-01',
      },
      'union-contributions': { startsOn: '2026-01-01' },
      exercises: { startsOn: '2026-01-01' },
      alimonies: { beneficiaryName: 'Beneficiario', startsOn: '2026-01-01' },
      'transit-benefits': {
        transitBenefitId: relatedId,
        startsOn: '2026-01-01',
      },
      processes: {
        processNumber: '001/2026',
        subject: 'Revisao',
        startsOn: '2026-01-01',
      },
      'process-functions': {
        processId: relatedId,
        jobFunctionId: relatedId,
        startsOn: '2026-01-01',
      },
      'organic-definitions': { name: 'Organico' },
    };

    for (const definition of service.listDefinitions()) {
      const input = minimalInputs[definition.key];
      await expect(
        service.createWorkflowRecord(
          definition.key,
          input,
          definition.employeeScoped ? employeeId : undefined,
        ),
      ).resolves.toMatchObject({ workflow: definition.key });
      await expect(
        service.updateWorkflowRecord(definition.key, workflowRow.id, input),
      ).resolves.toMatchObject({ workflow: definition.key });
    }

    await expect(
      service.createWorkflowRecord(
        'leaves',
        { startsOn: '2026-01-10', endsOn: '2026-01-01' },
        employeeId,
      ),
    ).rejects.toThrow('endsOn must be greater than startsOn');
    await expect(
      new RhWorkflowsService({
        configured: true,
        query: jest.fn(async (sql: string) => {
          if (sql.includes('daterange(')) return [{ total: '1' }];
          if (sql.includes('SELECT * FROM (SELECT')) return [workflowRow];
          return [];
        }),
      } as never).createWorkflowRecord(
        'leaves',
        { startsOn: '2026-01-01' },
        employeeId,
      ),
    ).rejects.toThrow('already has an active leave');
  });
});
