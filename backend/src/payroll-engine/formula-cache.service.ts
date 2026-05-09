import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import { domainError } from '../common/errors/domain-error';

interface EvaluationRow extends QueryResultRow {
  amount: string | null;
}

export interface CompiledFormulaCacheRecord {
  tenantId: string;
  earningDeductionId: string;
  version: number;
  compiledSql: string;
}

@Injectable()
export class FormulaCacheService {
  constructor(private readonly databaseService: DatabaseService) {}

  async materialize(record: CompiledFormulaCacheRecord): Promise<void> {
    this.ensureDatabase();
    await this.databaseService.query(
      `
      INSERT INTO payroll_calc.formula_cache (
        tenant_id,
        earning_deduction_id,
        version,
        compiled_sql,
        compiled_at
      )
      VALUES ($1::uuid, $2::uuid, $3::integer, $4, now())
      ON CONFLICT (tenant_id, earning_deduction_id, version) DO UPDATE
      SET compiled_sql = EXCLUDED.compiled_sql,
          compiled_at = EXCLUDED.compiled_at
      `,
      [
        record.tenantId,
        record.earningDeductionId,
        record.version,
        record.compiledSql,
      ],
    );
  }

  async evaluate(
    tenantId: string,
    earningDeductionId: string,
    employeeId: string,
    competence: string,
  ): Promise<string | null> {
    this.ensureDatabase();
    const [yearText, monthText] = competence.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'competence must use YYYY-MM format',
      );
    }

    const rows = await RequestContextStore.run(
      {
        tenantId,
        permissions: [
          'payroll.formula.read',
          'folha.rubrica.read',
          'folha.rubrica.preview',
          'folha.read',
          'rh.employee.read',
          'rh.dependent.read',
          'avaliacao.salary_history.read',
        ],
        bypassRls: false,
      },
      () =>
        this.databaseService.query<EvaluationRow>(
          `
          SELECT payroll_calc.evaluate_earning_deduction(
            $1::uuid,
            $2::uuid,
            $3::integer,
            $4::integer
          )::text AS amount
          `,
          [earningDeductionId, employeeId, month, year],
        ),
    );
    return rows[0]?.amount ?? null;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }
}
