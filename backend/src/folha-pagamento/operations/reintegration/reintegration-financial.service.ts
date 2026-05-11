import { Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { IdRow, LinkRow } from './reintegration-eligibility.service';

interface PayrollTypeRow extends QueryResultRow {
  payroll_type_id: string;
  processing_type_id: string;
}

interface EarningRow extends QueryResultRow {
  id: string;
}

interface AmountRow extends QueryResultRow {
  amount: string;
}

interface TotalRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

@Injectable()
export class ReintegrationFinancialService {
  async reprocessRetroactivePayroll(
    client: PoolClient,
    tenantId: string,
    link: LinkRow,
    terminationDate: string,
    decisionDate: string,
  ): Promise<{ competencies: string[]; totalPayable: string }> {
    const payrollTypes = await this.ensureRetroPayrollTypes(
      client,
      tenantId,
      link,
    );
    const earnings = await client.query<EarningRow>(
      `
      SELECT id::text
      FROM payroll.payroll_earning_deduction
      WHERE tenant_id = $1::uuid
        AND active = true
        AND kind = 'EARNING'::"PayrollEntryKind"
        AND formula_ready = true
      ORDER BY code
      `,
      [tenantId],
    );
    if (earnings.rows.length === 0) {
      throw new NotFoundException(
        'No compiled payroll earnings available for reintegration',
      );
    }

    const competencies = competenceRange(terminationDate, decisionDate);
    let totalPayableCents = 0n;
    for (const competence of competencies) {
      const [yearText, monthText] = competence.split('-');
      const year = Number(yearText);
      const month = Number(monthText);
      const runId = await this.ensureRetroRun(
        client,
        tenantId,
        link,
        payrollTypes,
        year,
        month,
      );
      for (const earning of earnings.rows) {
        const amountRows = await client.query<AmountRow>(
          `
          SELECT payroll_calc.evaluate_earning_deduction(
            $1::uuid,
            $2::uuid,
            $3::int,
            $4::int
          )::numeric(14,2)::text AS amount
          `,
          [earning.id, link.employee_id, month, year],
        );
        const amount = amountRows.rows[0]?.amount ?? '0.00';
        totalPayableCents += cents(amount);
        await client.query(
          `
          INSERT INTO payroll.employee_payroll_item (
            tenant_id,
            employee_id,
            payroll_run_id,
            earning_deduction_id,
            source,
            competence_year,
            competence_month,
            quantity,
            reference_value,
            amount,
            notes
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::uuid,
            'CALCULATED'::"PayrollEntrySource",
            $5,
            $6,
            1.0000,
            $7::numeric(14,2),
            $7::numeric(14,2),
            'REINSTATEMENT_RETRO'
          )
          ON CONFLICT (idempotency_key)
          WHERE deleted_at IS NULL
            AND idempotency_key IS NOT NULL
          DO UPDATE
          SET amount = EXCLUDED.amount,
              reference_value = EXCLUDED.reference_value,
              notes = EXCLUDED.notes,
              updated_at = now()
          `,
          [tenantId, link.employee_id, runId, earning.id, year, month, amount],
        );
      }
      await this.refreshRunTotals(client, tenantId, runId, link, competence);
    }
    return {
      competencies,
      totalPayable: formatCents(totalPayableCents),
    };
  }

  async ensureRetroPayrollTypes(
    client: PoolClient,
    tenantId: string,
    link: LinkRow,
  ): Promise<PayrollTypeRow> {
    const payrollType = await client.query<IdRow>(
      `
      INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
      VALUES ($1::uuid, 'REINSTATEMENT_RETRO', 'Reintegration retroactive payroll', 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description,
          status = EXCLUDED.status,
          updated_at = now()
      RETURNING id::text
      `,
      [tenantId],
    );
    const processingType = await client.query<IdRow>(
      `
      INSERT INTO payroll.processing_type (
        tenant_id,
        code,
        description,
        payroll_type_id,
        employment_link_id,
        status
      )
      VALUES (
        $1::uuid,
        'REINSTATEMENT_RETRO',
        'Reintegration retroactive reprocessing',
        $2::uuid,
        $3::uuid,
        'ACTIVE'::"RecordStatus"
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description,
          payroll_type_id = EXCLUDED.payroll_type_id,
          employment_link_id = EXCLUDED.employment_link_id,
          status = EXCLUDED.status,
          updated_at = now()
      RETURNING id::text
      `,
      [tenantId, payrollType.rows[0]!.id, link.employment_link_id],
    );
    return {
      payroll_type_id: payrollType.rows[0]!.id,
      processing_type_id: processingType.rows[0]!.id,
    };
  }

  async ensureRetroRun(
    client: PoolClient,
    tenantId: string,
    link: LinkRow,
    payrollTypes: PayrollTypeRow,
    year: number,
    month: number,
  ): Promise<string> {
    const existing = await client.query<IdRow>(
      `
      SELECT id::text
      FROM payroll.payroll_run
      WHERE tenant_id = $1::uuid
        AND competence_year = $2
        AND competence_month = $3
        AND branch_id IS NOT DISTINCT FROM NULLIF($4, '')::uuid
        AND payroll_type_id = $5::uuid
        AND processing_type_id = $6::uuid
      LIMIT 1
      `,
      [
        tenantId,
        year,
        month,
        link.branch_id ?? '',
        payrollTypes.payroll_type_id,
        payrollTypes.processing_type_id,
      ],
    );
    if (existing.rows[0]) {
      await client.query(
        `
        UPDATE payroll.payroll_run
        SET status = 'PROCESSING'::"PayrollRunStatus",
            cause = 'REINSTATEMENT_RETRO',
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND id = $2::uuid
        `,
        [tenantId, existing.rows[0].id],
      );
      return existing.rows[0].id;
    }

    const inserted = await client.query<IdRow>(
      `
      INSERT INTO payroll.payroll_run (
        tenant_id,
        competence_year,
        competence_month,
        branch_id,
        payroll_type_id,
        processing_type_id,
        status,
        cause
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        NULLIF($4, '')::uuid,
        $5::uuid,
        $6::uuid,
        'PROCESSING'::"PayrollRunStatus",
        'REINSTATEMENT_RETRO'
      )
      RETURNING id::text
      `,
      [
        tenantId,
        year,
        month,
        link.branch_id ?? '',
        payrollTypes.payroll_type_id,
        payrollTypes.processing_type_id,
      ],
    );
    return inserted.rows[0]!.id;
  }

  async refreshRunTotals(
    client: PoolClient,
    tenantId: string,
    runId: string,
    link: LinkRow,
    competence: string,
  ): Promise<void> {
    const totals = await client.query<TotalRow>(
      `
      SELECT
        count(DISTINCT item.employee_id)::text AS employee_count,
        coalesce(sum(CASE WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16,2)::text AS total_earnings,
        coalesce(sum(CASE WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16,2)::text AS total_deductions,
        coalesce(sum(CASE
          WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::numeric(16,2)::text AS total_net
      FROM payroll.v_payroll_run_line_active item
      JOIN payroll.payroll_earning_deduction earning ON earning.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      `,
      [runId],
    );
    const total = totals.rows[0]!;
    await client.query(
      `
      UPDATE payroll.payroll_run
      SET status = 'GENERATED'::"PayrollRunStatus",
          employee_count = $2::int,
          total_earnings = $3::numeric(16,2),
          total_deductions = $4::numeric(16,2),
          total_net = $5::numeric(16,2),
          cause = 'REINSTATEMENT_RETRO',
          updated_at = now()
      WHERE tenant_id = $1::uuid
        AND id = $6::uuid
      `,
      [
        tenantId,
        total.employee_count,
        total.total_earnings,
        total.total_deductions,
        total.total_net,
        runId,
      ],
    );
    const [yearText, monthText] = competence.split('-');
    await client.query(
      'SELECT payroll.sgp_create_payroll_financial_record_partition(make_date($1::integer, $2::integer, 1))',
      [Number(yearText), Number(monthText)],
    );
    await client.query(
      `
      INSERT INTO payroll.payroll_financial_record (
        tenant_id,
        employee_id,
        payroll_run_id,
        branch_id,
        work_location_id,
        functional_status_id,
        competence_year,
        competence_month,
        competence,
        total_earnings,
        total_deductions,
        net_amount,
        metadata
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        NULLIF($4, '')::uuid,
        NULLIF($5, '')::uuid,
        NULLIF($6, '')::uuid,
        $7,
        $8,
        make_date($7::integer, $8::integer, 1),
        $9::numeric(16,2),
        $10::numeric(16,2),
        $11::numeric(16,2),
        $12::jsonb
      )
      ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id, competence)
      DO UPDATE
      SET total_earnings = EXCLUDED.total_earnings,
          total_deductions = EXCLUDED.total_deductions,
          net_amount = EXCLUDED.net_amount,
          metadata = EXCLUDED.metadata,
          generated_at = now()
      `,
      [
        tenantId,
        link.employee_id,
        runId,
        link.branch_id ?? '',
        link.work_location_id ?? '',
        link.functional_status_id ?? '',
        Number(yearText),
        Number(monthText),
        total.total_earnings,
        total.total_deductions,
        total.total_net,
        JSON.stringify({ cause: 'REINSTATEMENT_RETRO' }),
      ],
    );
    await client.query(
      `
      INSERT INTO payroll.payroll_run_status_history (
        tenant_id,
        payroll_run_id,
        status,
        note,
        metadata
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        'GENERATED'::"PayrollRunStatus",
        'Reintegration retroactive payroll reprocessed',
        $3::jsonb
      )
      `,
      [
        tenantId,
        runId,
        JSON.stringify({ cause: 'REINSTATEMENT_RETRO', competence }),
      ],
    );
  }
}

function competenceRange(
  terminationDate: string,
  decisionDate: string,
): string[] {
  const start = new Date(`${terminationDate.slice(0, 7)}-01T00:00:00.000Z`);
  const endSeed = new Date(`${decisionDate.slice(0, 7)}-01T00:00:00.000Z`);
  endSeed.setUTCMonth(endSeed.getUTCMonth() - 1);
  const end = endSeed < start ? start : endSeed;
  const result: string[] = [];
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  ) {
    result.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }
  return result;
}

function cents(value: string): bigint {
  const [whole = '', fraction = ''] = value.split('.');
  const sign = whole.startsWith('-') ? -1n : 1n;
  const normalizedWhole = whole.replace('-', '') || '0';
  const normalizedFraction = fraction.padEnd(2, '0').slice(0, 2);
  return sign * (BigInt(normalizedWhole) * 100n + BigInt(normalizedFraction));
}

function formatCents(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
