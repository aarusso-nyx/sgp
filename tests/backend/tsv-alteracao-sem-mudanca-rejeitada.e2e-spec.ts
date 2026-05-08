import { BadRequestException } from '@nestjs/common';

import { RequestContextStore } from '../../backend/src/common/request-context/request-context.store';
import { TsvContractService } from '../../backend/src/folha-pagamento/operations/tsv/tsv-contract.service';

describe('TS-V no-op contractual change rejection', () => {
  it('rejects patches without a real field diff using a typed error', async () => {
    const service = new TsvContractService({
      transaction: async (callback: (client: unknown) => Promise<unknown>) =>
        callback({
          query: jest.fn(async (sql: string) => {
            if (sql.includes('FROM hr.tsv_contract')) {
              return {
                rows: [
                  {
                    id: 'contract',
                    tenant_id: 'tenant',
                    start_date: '2026-04-01',
                    role: 'Estagiario',
                    monthly_amount: '1200.00',
                    weekly_hours: '30.000000',
                    workplace_id: 'workplace',
                    supervisor_employee_id: null,
                    education_institution: null,
                    internship_plan_uri: null,
                  },
                ],
              };
            }
            return { rows: [] };
          }),
        }),
    } as never);

    await RequestContextStore.run(
      {
        tenantId: '00000000-0000-0000-0000-000000078099',
        permissions: ['hr.employment.write'],
      },
      async () => {
        await expect(
          service.update('contract', {
            effectiveDate: '2026-05-01',
            reason: 'Sem alteracao',
            monthlyAmount: '1200.00',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );
  });

  it('records every changed TS-V field and applies snapshot markers', async () => {
    const queries: Array<{ sql: string; values: unknown[] | undefined }> = [];
    const service = new TsvContractService({
      transaction: async (callback: (client: unknown) => Promise<unknown>) =>
        callback({
          query: jest.fn(async (sql: string, values?: unknown[]) => {
            queries.push({ sql, values });
            if (sql.includes('FROM hr.tsv_contract')) {
              return {
                rows: [
                  {
                    id: 'contract',
                    tenant_id: 'tenant',
                    start_date: '2026-04-01',
                    role: 'Estagiario',
                    monthly_amount: '1200.00',
                    weekly_hours: '30.000000',
                    workplace_id: 'workplace-old',
                    supervisor_employee_id: 'supervisor-old',
                    education_institution: null,
                    internship_plan_uri: 'old.pdf',
                  },
                ],
              };
            }
            if (sql.includes('INSERT INTO hr.tsv_contract_change')) {
              return {
                rows: [
                  {
                    id: 'change',
                    tenant_id: 'tenant',
                    tsv_contract_id: 'contract',
                    effective_date: '2026-05-01',
                    fields_changed: JSON.parse(String(values?.[3])),
                    previous_values: JSON.parse(String(values?.[4])),
                    new_values: JSON.parse(String(values?.[5])),
                    reason: values?.[6],
                  },
                ],
              };
            }
            return { rows: [] };
          }),
        }),
    } as never);

    const result = await RequestContextStore.run(
      {
        actor: {
          tenantId: 'tenant',
          id: 'actor',
          type: 'user',
          roles: [],
          permissions: [],
        },
        tenantId: 'ignored-tenant',
        permissions: ['hr.employment.write'],
      },
      () =>
        service.update('contract', {
          effectiveDate: '2026-05-01',
          reason: 'Atualizacao contratual',
          role: 'Aprendiz',
          monthlyAmount: '1300,5',
          weeklyHours: '20',
          workplaceId: 'workplace-new',
          supervisorEmployeeId: null,
          educationInstitution: 'Faculdade',
          internshipPlanUri: null,
        }),
    );

    expect(result.fieldsChanged).toEqual({
      role: true,
      monthly_amount: true,
      weekly_hours: true,
      workplace_id: true,
      supervisor_employee_id: true,
      education_institution: true,
      internship_plan_uri: true,
    });
    expect(result.previousValues.supervisor_employee_id).toBe('supervisor-old');
    expect(result.newValues).toMatchObject({
      role: 'Aprendiz',
      monthly_amount: '1300.50',
      weekly_hours: '20.000000',
      supervisor_employee_id: null,
      education_institution: 'Faculdade',
      internship_plan_uri: null,
    });
    const snapshot = queries.find((query) =>
      query.sql.includes('UPDATE hr.tsv_contract'),
    );
    expect(snapshot?.values).toEqual([
      'contract',
      'Aprendiz',
      '1300.50',
      '20.000000',
      'workplace-new',
      '',
      'Faculdade',
      '',
    ]);
  });

  it.each([
    ['missing context', undefined, 'Tenant context is required'],
    [
      'blank reason',
      { effectiveDate: '2026-05-01', reason: '   ' },
      'Change reason is required',
    ],
    [
      'invalid decimal',
      { effectiveDate: '2026-05-01', reason: 'ok', monthlyAmount: 'abc' },
      'Invalid decimal value for TS-V contract',
    ],
  ])('rejects %s before persisting changes', async (_name, patch, message) => {
    const service = new TsvContractService({
      transaction: async (callback: (client: unknown) => Promise<unknown>) =>
        callback({
          query: jest.fn(async (sql: string) => {
            if (sql.includes('FROM hr.tsv_contract')) {
              return {
                rows: [
                  {
                    id: 'contract',
                    tenant_id: 'tenant',
                    start_date: '2026-04-01',
                    role: 'Estagiario',
                    monthly_amount: '1200.00',
                    weekly_hours: '30.000000',
                    workplace_id: 'workplace',
                    supervisor_employee_id: null,
                    education_institution: null,
                    internship_plan_uri: null,
                  },
                ],
              };
            }
            return { rows: [] };
          }),
        }),
    } as never);

    const action = () =>
      patch
        ? RequestContextStore.run({ tenantId: 'tenant', permissions: [] }, () =>
            service.update('contract', patch as never),
          )
        : service.update('contract', {
            effectiveDate: '2026-05-01',
            reason: 'ok',
            role: 'Aprendiz',
          });

    await expect(action()).rejects.toThrow(message);
  });

  it('rejects missing contracts and changes before contract start', async () => {
    const service = new TsvContractService({
      transaction: async (callback: (client: unknown) => Promise<unknown>) =>
        callback({
          query: jest.fn(async (sql: string) => {
            if (sql.includes('FROM hr.tsv_contract')) {
              return { rows: [] };
            }
            return { rows: [] };
          }),
        }),
    } as never);

    await RequestContextStore.run(
      { tenantId: 'tenant', permissions: [] },
      async () => {
        await expect(
          service.update('missing', {
            effectiveDate: '2026-05-01',
            reason: 'ok',
            role: 'Aprendiz',
          }),
        ).rejects.toThrow('TS-V contract not found');
      },
    );

    const dated = new TsvContractService({
      transaction: async (callback: (client: unknown) => Promise<unknown>) =>
        callback({
          query: jest.fn(async (sql: string) => {
            if (sql.includes('FROM hr.tsv_contract')) {
              return {
                rows: [
                  {
                    id: 'contract',
                    tenant_id: 'tenant',
                    start_date: '2026-06-01',
                    role: 'Estagiario',
                    monthly_amount: '1200.00',
                    weekly_hours: '30.000000',
                    workplace_id: 'workplace',
                    supervisor_employee_id: null,
                    education_institution: null,
                    internship_plan_uri: null,
                  },
                ],
              };
            }
            return { rows: [] };
          }),
        }),
    } as never);

    await RequestContextStore.run(
      { tenantId: 'tenant', permissions: [] },
      async () => {
        await expect(
          dated.update('contract', {
            effectiveDate: '2026-05-01',
            reason: 'ok',
            role: 'Aprendiz',
          }),
        ).rejects.toThrow('effectiveDate cannot be before startDate');
      },
    );
  });
});
