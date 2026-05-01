import { BadRequestException } from '@nestjs/common';

import { LeavesService } from './leaves.service';

const employeeId = '00000000-0000-4000-8000-000000000001';
const tenantId = '00000000-0000-0000-0000-000000000100';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leave-1',
    employee_id: employeeId,
    reason: 'maternidade',
    starts_on: '2026-05-01',
    ends_on: '2026-08-28',
    days: 120,
    paid: true,
    status: 'ACTIVE',
    notes: '',
    supporting_document_ref: null,
    requested_at: '2026-05-01T00:00:00.000Z',
    approved_at: null,
    approved_by: null,
    ...overrides,
  };
}

function database(
  options: { empresaCidada?: boolean; rejectEligibility?: boolean } = {},
) {
  const query = jest.fn(
    async (sql: string, values: readonly unknown[] = []) => {
      if (sql.includes('FROM hr.employee')) {
        return { rows: [{ employee_id: employeeId, tenant_id: tenantId }] };
      }
      if (sql.includes('FROM public.system_parameter')) {
        return { rows: options.empresaCidada ? [{ active: true }] : [] };
      }
      if (sql.includes('INSERT INTO hr.absence_reason')) {
        return { rows: [{ id: 'reason-1' }] };
      }
      if (sql.includes('hr.f_validate_leave_eligibility')) {
        if (options.rejectEligibility) {
          throw new Error('requires at least five years of service');
        }
        return { rows: [{ f_validate_leave_eligibility: true }] };
      }
      if (sql.includes('INSERT INTO hr.leave_record')) {
        return {
          rows: [row({ reason: values[9], days: values[5], paid: values[6] })],
        };
      }
      if (sql.includes('FROM hr.leave_record')) {
        return { rows: [row({ reason: 'capacitacao' })] };
      }
      if (sql.includes('UPDATE hr.leave_record')) {
        return { rows: [row({ approved_at: '2026-05-02T00:00:00.000Z' })] };
      }
      return { rows: [] };
    },
  );
  return {
    configured: true,
    query,
    transaction: (
      callback: (client: { query: typeof query }) => Promise<unknown>,
    ) => callback({ query }),
  };
}

describe('LeavesService', () => {
  it('creates maternity leave with 120 days by default', async () => {
    const service = new LeavesService(database() as never);

    await expect(
      service.create({
        employeeId,
        reason: 'maternidade',
        startsOn: '2026-05-01',
      }),
    ).resolves.toMatchObject({ reason: 'maternidade', days: 120, paid: true });
  });

  it('creates maternity leave with 180 days when Empresa Cidada is active', async () => {
    const service = new LeavesService(
      database({ empresaCidada: true }) as never,
    );

    await expect(
      service.create({
        employeeId,
        reason: 'maternidade',
        startsOn: '2026-05-01',
      }),
    ).resolves.toMatchObject({ days: 180 });
  });

  it('rejects capacitacao before five years of service', async () => {
    const service = new LeavesService(
      database({ rejectEligibility: true }) as never,
    );

    await expect(
      service.create({
        employeeId,
        reason: 'capacitacao',
        startsOn: '2026-05-01',
      }),
    ).rejects.toThrow('requires at least five years');
  });

  it('records interesse particular as unpaid', async () => {
    const service = new LeavesService(database() as never);

    await expect(
      service.create({
        employeeId,
        reason: 'interesse_particular',
        startsOn: '2026-05-01',
      }),
    ).resolves.toMatchObject({ paid: false });
  });

  it('requires a supported reason', async () => {
    const service = new LeavesService(database() as never);

    await expect(
      service.create({
        employeeId,
        reason: 'saude' as never,
        startsOn: '2026-05-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
