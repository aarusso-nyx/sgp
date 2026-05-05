import { ManagerialQueriesService } from './managerial-queries.service';
import {
  TEST_INSTANT_2020_01_01T00_00_00_000Z,
  TEST_INSTANT_2026_04_25T10_00_00_000Z,
} from '../../../tests/backend/helpers/date-fixtures';

describe('ManagerialQueriesService', () => {
  const createQuery = () =>
    jest.fn(async (sql: string) => {
      if (sql.includes('payroll.payroll_financial_record')) {
        return [
          {
            id: 'fin-1',
            employee_id: 'emp-1',
            registration: '0001',
            employee_name: 'Maria',
            competence_year: 2026,
            competence_month: 4,
            total_earnings: '5000.00',
            total_deductions: '1000.00',
            net_amount: '4000.00',
            branch_name: 'Matriz',
            work_location_name: 'RH',
          },
        ];
      }
      if (sql.includes('GROUP BY employee.lifecycle_status')) {
        return [
          {
            lifecycle_status: 'ACTIVE',
            functional_status_name: null,
            total: '12',
          },
        ];
      }
      if (sql.includes('employee.lifecycle_status::text')) {
        return [
          {
            id: 'emp-1',
            registration: '0001',
            employee_name: 'Maria',
            cpf: '00011122233',
            branch_name: 'Matriz',
            work_location_name: 'RH',
            job_position_name: 'Analista',
            job_function_name: 'Gestora',
            functional_status_name: 'Ativo',
            lifecycle_status: 'ACTIVE',
            hired_on: new Date(TEST_INSTANT_2020_01_01T00_00_00_000Z),
            terminated_on: '2026-01-01',
          },
        ];
      }
      if (sql.includes('payroll.blocked_payment')) {
        if (sql.includes('count(*)::text AS total')) return [{ total: '1' }];
        return [
          {
            id: 'block-1',
            employee_id: 'emp-1',
            registration: '0001',
            employee_name: 'Maria',
            competence_year: 2026,
            competence_month: 4,
            blocked_at: new Date(TEST_INSTANT_2026_04_25T10_00_00_000Z),
            released_at: null,
            notes: 'Bloqueio',
            reason_name: 'Judicial',
          },
        ];
      }
      if (sql.includes('public.audit_event')) {
        return [
          {
            id: 'audit-1',
            occurred_at: '2026-04-25T10:00:00.000Z',
            actor_login: null,
            action: 'CREATE',
            resource_type: 'employee',
            resource_id: null,
            table_name: 'employee',
            metadata: 'ignored',
          },
        ];
      }
      if (sql.includes('count(*)::text AS total')) return [{ total: '0' }];
      return [];
    });

  it('returns managerial dashboard totals', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '12' }])
      .mockResolvedValueOnce([{ total: '2' }])
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([{ total: '3' }]);
    const service = new ManagerialQueriesService({
      configured: true,
      query,
    } as never);

    const result = await service.dashboard();

    expect(result).toEqual({
      servidoresAtivos: 12,
      folhasAbertas: 2,
      pagamentosBloqueados: 1,
      recadastramentosPendentes: 3,
    });
  });

  it('maps managerial query result sets and optional filters', async () => {
    const query = createQuery();
    const service = new ManagerialQueriesService({
      configured: true,
      query,
    } as never);

    await expect(
      service.listFinancialRecords({
        funcionarioId: 'emp-1',
        competenciaAno: 2026,
        competenciaMes: 4,
      }),
    ).resolves.toMatchObject([{ liquido: 4000, filial: 'Matriz' }]);
    await expect(service.listFinancialRecords({})).resolves.toHaveProperty(
      '0.competenciaAno',
      2026,
    );
    await expect(
      service.listFunctionalRecords({
        situacaoFuncionalId: 'status-1',
        lotacaoId: 'lot-1',
      }),
    ).resolves.toMatchObject([
      { admitidoEm: '2020-01-01', desligadoEm: '2026-01-01' },
    ]);
    await expect(service.listFunctionalRecords({})).resolves.toHaveProperty(
      '0.situacaoCiclo',
      'ACTIVE',
    );
    await expect(service.listSituationReports()).resolves.toEqual([
      { situacaoCiclo: 'ACTIVE', situacaoFuncional: null, total: 12 },
    ]);
    await expect(
      service.listBlockedPayments({ competenciaAno: 2026, competenciaMes: 4 }),
    ).resolves.toMatchObject([{ liberadoEm: null, motivo: 'Judicial' }]);
    await expect(
      service.listOperationalHistory({ recurso: 'employee' }),
    ).resolves.toMatchObject([{ metadata: {}, usuario: null }]);
    await expect(service.listOperationalHistory({})).resolves.toHaveLength(1);
  });

  it('rejects managerial queries without a configured database', async () => {
    await expect(
      new ManagerialQueriesService({ configured: false } as never).dashboard(),
    ).rejects.toThrow('DATABASE_URL is not configured');
  });
});
