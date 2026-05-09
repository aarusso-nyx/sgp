import { ServiceUnavailableException } from '@nestjs/common';

import { PortalService } from './portal.service';
import {
  TEST_INSTANT_2026_04_01T10_00_00_000Z,
  TEST_INSTANT_2026_05_02T10_00_00_000Z,
} from '../../../tests/backend/helpers/date-fixtures';

describe('PortalService', () => {
  const actor = {
    sub: 'sub-1',
    username: 'portal.user',
    tenantId: '00000000-0000-0000-0000-000000000100',
    groups: [],
    permissions: [],
    claims: { cpf: '00011122233', email: 'portal@example.test' },
  };
  const employee = {
    id: 'employee-1',
    registration: 'MAT-1',
    name: 'Servidor Teste',
    social_name: 'Servidor Social',
    cpf: '00011122233',
    birth_date: new Date('1990-01-02T00:00:00.000Z'),
    email: 'portal@example.test',
    phone: '11999999999',
    branch_id: '00000000-0000-4000-8000-000000000010',
    work_location_id: '00000000-0000-4000-8000-000000000020',
    cost_center_id: '00000000-0000-4000-8000-000000000030',
    pis_pasep: '123',
    rg: 'MG-1',
    rg_issuer: 'SSP',
    mother_name: 'Mae',
    father_name: 'Pai',
    address: { street: 'Rua A' },
  };

  it('returns current session and Gov.br status', () => {
    const service = new PortalService({ configured: false } as never);

    expect(service.currentSession(undefined)).toEqual({
      actor: undefined,
      authenticated: false,
    });
    expect(service.currentSession(actor).authenticated).toBe(true);
    expect(service.govBrStatus()).toMatchObject({
      provider: 'govbr',
      status: 'available',
    });
  });

  it('maps payroll summary rows with paging defaults and search', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '3' }])
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          status: 'OPEN',
          branch_code: '001',
          branch_name: 'Matriz',
          payroll_type_code: 'MENSAL',
          processing_type_code: 'NORMAL',
          employee_count: 12,
          total_earnings: '1000.00',
          total_deductions: '100.00',
          total_net: '900.00',
          created_at: new Date(TEST_INSTANT_2026_04_01T10_00_00_000Z),
          closed_at: '2026-04-30T20:00:00.000Z',
        },
      ]);
    const service = new PortalService({ configured: true, query } as never);

    const result = await service.payrollSummary({
      page: 2,
      pageSize: 2,
      search: 'Matriz',
    });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
    expect(result.items[0]).toMatchObject({
      id: 'run-1',
      competenceYear: 2026,
      branchCode: '001',
      closedAt: '2026-04-30T20:00:00.000Z',
    });
    expect(query).toHaveBeenNthCalledWith(1, expect.any(String), ['%matriz%']);
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [
      '%matriz%',
      2,
      2,
    ]);
  });

  it('returns an empty page when no payroll summary rows exist', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const service = new PortalService({ configured: true, query } as never);

    await expect(service.payrollSummary({})).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('requires a configured database for portal payroll operations', async () => {
    const service = new PortalService({ configured: false } as never);

    await expect(service.payrollSummary({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps personal, contact, dependents, documents, and job data', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          id: 'dep-1',
          name: 'Dependente',
          cpf: null,
          birth_date: '2020-01-01',
          relationship: 'CHILD',
          income_tax_dependent: true,
          active: true,
        },
      ])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          file_name: 'rg.pdf',
          content_type: null,
          size_bytes: null,
          checksum: null,
          created_at: new Date(TEST_INSTANT_2026_05_02T10_00_00_000Z),
        },
      ])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          job_position_code: 'ANL',
          job_position_name: 'Analista',
          class_number: 1,
          level_number: 2,
          base_salary: '5000.00',
        },
      ]);
    const service = new PortalService({ configured: true, query } as never);

    await expect(service.getPersonalData(actor)).resolves.toMatchObject({
      id: 'employee-1',
      socialName: 'Servidor Social',
      birthDate: '1990-01-02',
    });
    await expect(service.getAddress(actor)).resolves.toEqual({
      street: 'Rua A',
    });
    await expect(service.getContact(actor)).resolves.toEqual({
      email: 'portal@example.test',
      phone: '11999999999',
    });
    await expect(service.getDependents(actor)).resolves.toMatchObject([
      { id: 'dep-1', birthDate: '2020-01-01', incomeTaxDependent: true },
    ]);
    await expect(service.getDocuments(actor)).resolves.toMatchObject([
      {
        id: 'doc-1',
        fileName: 'rg.pdf',
        createdAt: '2026-05-02T10:00:00.000Z',
      },
    ]);
    await expect(service.getMyJob(actor)).resolves.toEqual({
      cargo: 'Analista',
      codigoCargo: 'ANL',
      classe: 1,
      nivel: 2,
      vencimentoBasico: '5000.00',
    });
  });

  it('maps career, vacation, termination, paystub, and change request flows', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([{ motivo: 'Progressao' }])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          payroll_run_id: 'run-ferias',
          vacation_record_id: 'vac-1',
          competence_year: 2026,
          competence_month: 1,
          status: 'PAID',
          total_earnings: '1000.00',
          total_deductions: '0.00',
          total_net: '1000.00',
        },
      ])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          payroll_run_id: 'run-resc',
          competence_year: 2026,
          competence_month: 2,
          status: 'GENERATED',
          termination_date: '2026-02-15',
          total_earnings: '2000.00',
          total_deductions: '100.00',
          total_net: '1900.00',
          components: [{ code: 'RESC_SALDO' }],
        },
      ])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          payroll_run_id: 'run-pay',
          competence_year: 2026,
          competence_month: 5,
          payroll_status: 'CLOSED',
          competence_status: 'AVAILABLE',
          registration: 'MAT-1',
          employee_name: '<Servidor>',
          total_earnings: '3000.00',
          total_deductions: '500.00',
          net_amount: '2500.00',
          generated_at: '2026-05-31T20:00:00.000Z',
          lines: [
            {
              code: '100',
              description: 'Base & salario',
              kind: 'EARNING',
              amount: '3000.00',
            },
          ],
        },
      ])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([{ id: 'change-1' }]);
    const service = new PortalService(
      { configured: true, query } as never,
      { trailForActor: jest.fn().mockResolvedValue({ trail: 'ok' }) } as never,
      {
        checkInterstice: jest.fn().mockRejectedValue(new Error('not eligible')),
      } as never,
    );

    await expect(service.getMyCareer(actor)).resolves.toEqual({
      trail: 'ok',
      salaryHistory: [{ motivo: 'Progressao' }],
      nextProgression: null,
    });
    await expect(service.vacationPayslips(actor)).resolves.toMatchObject([
      { payrollRunId: 'run-ferias', totalNet: '1000.00' },
    ]);
    await expect(service.terminationTerms(actor)).resolves.toMatchObject([
      {
        payrollRunId: 'run-resc',
        terminationDate: '2026-02-15',
        components: [{ code: 'RESC_SALDO' }],
      },
    ]);
    await expect(service.getPaystub(actor, '2026-05')).resolves.toMatchObject({
      payrollRunId: 'run-pay',
      competence: '2026-05',
      html: expect.stringContaining('&lt;Servidor&gt;'),
    });
    await expect(
      service.requestProfileChange(actor, 'contato', { phone: '11000000000' }),
    ).resolves.toMatchObject({
      id: 'change-1',
      previousPayload: { email: 'portal@example.test', phone: '11999999999' },
    });
  });

  it('rejects missing employees and invalid paystub competences', async () => {
    const service = new PortalService({
      configured: true,
      query: jest.fn().mockResolvedValueOnce([]),
    } as never);

    await expect(service.getPersonalData(actor)).rejects.toThrow(
      'Employee profile not found for portal actor',
    );

    const withEmployee = new PortalService({
      configured: true,
      query: jest.fn().mockResolvedValue([employee]),
    } as never);
    await expect(withEmployee.getPaystub(actor, '2026-13')).rejects.toThrow(
      'Paystub competence is invalid',
    );
    await expect(withEmployee.getPaystub(actor, 'bad')).rejects.toThrow(
      'Paystub competence must use YYYY-MM',
    );
  });

  it('creates and lists portal document requests', async () => {
    const requestRow = {
      id: 'request-1',
      employee_id: 'employee-1',
      document_kind: 'ficha-funcional',
      purpose: 'posse',
      status: 'REQUESTED',
      due_at: null,
      fulfilled_attachment_id: null,
      notes: '',
      created_at: '2026-05-08T12:00:00.000Z',
      updated_at: '2026-05-08T12:00:00.000Z',
    };
    const query = jest
      .fn()
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([requestRow])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([requestRow]);
    const service = new PortalService({ configured: true, query } as never);

    await expect(
      service.createDocumentRequest(actor, {
        documentKind: ' ficha-funcional ',
        purpose: 'posse',
      }),
    ).resolves.toMatchObject({
      id: 'request-1',
      documentKind: 'ficha-funcional',
      status: 'REQUESTED',
    });
    await expect(service.listDocumentRequests(actor)).resolves.toMatchObject([
      { id: 'request-1', purpose: 'posse' },
    ]);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT'),
      ['employee-1', 'ficha-funcional', 'posse', '', 'sub-1', 'portal.user'],
    );
  });

  it('loads and transitions the manager approval queue', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          kind: 'leave',
          id: 'leave-1',
          employee_id: 'employee-2',
          employee_registration: 'MAT-2',
          employee_name: 'Servidor Dois',
          title: 'Licenca premio',
          starts_on: '2026-05-01',
          ends_on: '2026-05-10',
          days: 10,
          status: 'ACTIVE',
          requested_at: '2026-04-20T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          id: 'leave-1',
          employee_id: 'employee-2',
          starts_on: '2026-05-01',
          ends_on: '2026-05-10',
          days: 10,
          status: 'ACTIVE',
          requested_at: '2026-04-20T12:00:00.000Z',
          approved_at: '2026-04-21T12:00:00.000Z',
          approved_by: 'portal.user',
        },
      ]);
    const service = new PortalService({ configured: true, query } as never);

    await expect(service.approvalQueue(actor)).resolves.toMatchObject([
      {
        kind: 'leave',
        id: 'leave-1',
        employeeName: 'Servidor Dois',
        startsOn: '2026-05-01',
      },
    ]);
    await expect(
      service.transitionApproval(actor, 'leave', 'leave-1', 'approve'),
    ).resolves.toMatchObject({
      kind: 'leave',
      id: 'leave-1',
      approvedBy: 'portal.user',
    });
  });
});
