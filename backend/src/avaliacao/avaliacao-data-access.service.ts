import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import {
  PerformanceEvaluationStatusInput,
  ProgressionKindInput,
} from './avaliacao.dto';
import {
  EmployeeReferenceRow,
  SalaryReferenceAmountRow,
} from './avaliacao.types';

@Injectable()
export class AvaliacaoDataAccessService {
  constructor(private readonly databaseService: DatabaseService) {}

  get configured(): boolean {
    return this.databaseService.configured;
  }

  ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  query<T extends QueryResultRow>(
    sql: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    return this.databaseService.query<T>(sql, values);
  }

  async employeeReference(employeeId: string): Promise<EmployeeReferenceRow> {
    const rows = await this.databaseService.query<EmployeeReferenceRow>(
      `
      SELECT
        id,
        registration,
        name,
        branch_id::text,
        work_location_id::text,
        job_position_id::text,
        job_function_id::text,
        salary_reference_id::text
      FROM hr.employee
      WHERE id = $1::uuid
      `,
      [employeeId],
    );
    const employee = rows[0];
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async salaryReference(id: string): Promise<SalaryReferenceAmountRow> {
    const rows = await this.databaseService.query<SalaryReferenceAmountRow>(
      `
      SELECT id, code, description, amount::text AS amount
      FROM hr.salary_reference
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Salary reference not found');
    }
    return rows[0];
  }

  async belongsToEmployee(
    tableName: 'hr.performance_evaluation',
    id: string,
    employeeId: string,
  ): Promise<boolean> {
    const rows = await this.databaseService.query<QueryResultRow>(
      `SELECT 1 FROM ${tableName} WHERE id = $1::uuid AND employee_id = $2::uuid`,
      [id, employeeId],
    );
    return Boolean(rows[0]);
  }

  toEvaluationStatusDb(status: PerformanceEvaluationStatusInput): string {
    switch (status) {
      case 'RASCUNHO':
        return 'DRAFT';
      case 'SUBMETIDA':
        return 'SUBMITTED';
      case 'APROVADA':
        return 'APPROVED';
      case 'REPROVADA':
        return 'REJECTED';
    }
  }

  toEvaluationStatusInput(value: string): PerformanceEvaluationStatusInput {
    switch (value) {
      case 'DRAFT':
        return 'RASCUNHO';
      case 'SUBMITTED':
        return 'SUBMETIDA';
      case 'APPROVED':
        return 'APROVADA';
      case 'REJECTED':
      default:
        return 'REPROVADA';
    }
  }

  toProgressionKindDb(kind: ProgressionKindInput): string {
    switch (kind) {
      case 'MERITO':
        return 'MERIT';
      case 'TITULARIDADE':
        return 'TITLE';
      case 'JUDICIAL':
        return 'JUDICIAL';
      case 'CORRECAO':
        return 'CORRECTION';
    }
  }

  toProgressionKindInput(value: string): ProgressionKindInput {
    switch (value) {
      case 'MERIT':
        return 'MERITO';
      case 'TITLE':
        return 'TITULARIDADE';
      case 'JUDICIAL':
        return 'JUDICIAL';
      case 'CORRECTION':
      default:
        return 'CORRECAO';
    }
  }

  asArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      return JSON.parse(value) as unknown[];
    }
    return [];
  }

  asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string' && value.trim()) {
      return JSON.parse(value) as Record<string, unknown>;
    }
    return {};
  }

  toIso(value: Date | string): string {
    return new Date(value).toISOString();
  }

  toIsoDate(value: Date | string): string {
    return this.toIso(value).slice(0, 10);
  }

  moneyDiff(source: string, target: string): string {
    return this.toMoney(Number(target) - Number(source));
  }

  toMoney(value: number): string {
    return value.toFixed(2);
  }
}
