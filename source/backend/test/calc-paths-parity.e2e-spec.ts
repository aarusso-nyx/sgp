import { Pool } from 'pg';

import { roundMoney } from '../src/common/money/money';

describe('CALC-08 SQL and TS money boundary parity', () => {
  let pool: Pool;

  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for calc-paths-parity');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('matches evaluate_earning_deduction cached numeric(14,2) to TS roundMoney', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.bypass_rls', 'true', true)");

      const rows = await client.query<{
        tenant_id: string;
        earning_deduction_id: string;
        employee_id: string;
        competence_month: number;
        competence_year: number;
        amount: string;
      }>(`
        SELECT
          fc.tenant_id::text,
          fc.earning_deduction_id::text,
          fc.employee_id::text,
          fc.competence_month,
          fc.competence_year,
          fc.amount::text
        FROM payroll_calc.formula_cache fc
        ORDER BY fc.updated_at DESC
        LIMIT 1
      `);

      if (!rows.rows[0]) {
        throw new Error(
          'calc-paths-parity requires at least one payroll_calc.formula_cache row; run db:smoke/seed before the e2e gate.',
        );
      }

      const row = rows.rows[0];
      await client.query(
        "SELECT set_config('app.current_tenant_id', $1, true)",
        [row.tenant_id],
      );
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [
        row.tenant_id,
      ]);

      const evaluated = await client.query<{ amount: string }>(
        `
        SELECT payroll_calc.evaluate_earning_deduction(
          $1::uuid,
          $2::uuid,
          $3,
          $4
        )::text AS amount
        `,
        [
          row.earning_deduction_id,
          row.employee_id,
          row.competence_month,
          row.competence_year,
        ],
      );

      expect(roundMoney(row.amount).toFixed(2)).toBe(
        roundMoney(evaluated.rows[0]?.amount ?? '0').toFixed(2),
      );
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
