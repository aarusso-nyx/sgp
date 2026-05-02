import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../../../database/database.service';
import { AudespPayrollEnvelope, AudespPayrollServer } from '../audesp-sp.types';

interface PayrollRunRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  status: string;
  competence_year: number;
  competence_month: number;
  organization_code: string | null;
}

interface PayrollItemRow extends QueryResultRow {
  employee_id: string;
  registration: string;
  cpf: string | null;
  position_name: string | null;
  entry_kind: 'EARNING' | 'DEDUCTION' | 'INFORMATION' | 'BASE';
  amount: string;
}

@Injectable()
export class PayrollToAudespMapper {
  constructor(private readonly databaseService: DatabaseService) {}

  async map(payrollRunId: string): Promise<AudespPayrollEnvelope> {
    const run = await this.loadRun(payrollRunId);
    if (run.status !== 'APPROVED') {
      throw new UnprocessableEntityException(
        'AUDESP/SP submission requires payroll_run.status=APPROVED',
      );
    }

    const items = await this.loadItems(payrollRunId);
    return this.mapRows(run, items);
  }

  mapRows(
    run: PayrollRunRow,
    items: PayrollItemRow[],
    generatedAt = '2026-05-02T00:00:00.000Z',
  ): AudespPayrollEnvelope {
    const groups = new Map<string, AudespPayrollServer>();
    for (const item of items) {
      const current =
        groups.get(item.employee_id) ??
        ({
          employeeId: item.employee_id,
          registration: item.registration,
          cpf: onlyDigits(item.cpf),
          position: item.position_name?.trim() || 'NAO_INFORMADO',
          earnings: '0.00',
          deductions: '0.00',
          net: '0.00',
        } satisfies AudespPayrollServer);

      const amount = new Decimal(item.amount || '0');
      if (item.entry_kind === 'EARNING') {
        current.earnings = money(new Decimal(current.earnings).plus(amount));
      } else if (item.entry_kind === 'DEDUCTION') {
        current.deductions = money(
          new Decimal(current.deductions).plus(amount),
        );
      }
      current.net = money(
        new Decimal(current.earnings).minus(current.deductions),
      );
      groups.set(item.employee_id, current);
    }

    return {
      adapterId: 'audesp-sp',
      layoutCode: 'AUDESP-FOLHA',
      layoutVersion: '0.0.1',
      tenantId: run.tenant_id,
      payrollRunId: run.id,
      organizationCode: run.organization_code?.trim() || run.tenant_id,
      competenceYear: Number(run.competence_year),
      competenceMonth: Number(run.competence_month),
      shipmentKind: 'FOLHA_PAGAMENTO',
      generatedAt,
      servers: [...groups.values()].sort((left, right) =>
        left.registration.localeCompare(right.registration),
      ),
    };
  }

  private async loadRun(payrollRunId: string): Promise<PayrollRunRow> {
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      SELECT
        run.id::text,
        run.tenant_id::text,
        run.status::text,
        run.competence_year,
        run.competence_month,
        COALESCE(company.code, company.cnpj, run.tenant_id::text) AS organization_code
      FROM payroll.payroll_run run
      LEFT JOIN LATERAL (
        SELECT code, cnpj
        FROM hr.company
        WHERE tenant_id = run.tenant_id
          AND status = 'ACTIVE'::"RecordStatus"
        ORDER BY code
        LIMIT 1
      ) company ON true
      WHERE run.id = $1::uuid
      `,
      [payrollRunId],
    );
    if (!rows[0])
      throw new NotFoundException(`Payroll run not found: ${payrollRunId}`);
    return rows[0];
  }

  private loadItems(payrollRunId: string): Promise<PayrollItemRow[]> {
    return this.databaseService.query<PayrollItemRow>(
      `
      SELECT
        employee.id::text AS employee_id,
        employee.registration,
        employee.cpf,
        job_position.name AS position_name,
        earning.kind::text AS entry_kind,
        sum(item.amount)::numeric(14,2)::text AS amount
      FROM payroll.v_payroll_run_line_active item
      JOIN payroll.payroll_earning_deduction earning
        ON earning.id = item.earning_deduction_id
       AND earning.tenant_id = item.tenant_id
      JOIN hr.employee employee
        ON employee.id = item.employee_id
       AND employee.tenant_id = item.tenant_id
      LEFT JOIN hr.job_position job_position
        ON job_position.id = employee.job_position_id
       AND job_position.tenant_id = employee.tenant_id
      WHERE item.payroll_run_id = $1::uuid
      GROUP BY employee.id, employee.registration, employee.cpf, job_position.name, earning.kind
      ORDER BY employee.registration, earning.kind
      `,
      [payrollRunId],
    );
  }
}

function onlyDigits(value: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

function money(value: Decimal): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}
