import { ConflictException, Injectable } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  SalaryRangeLevelMutationDto,
  SalaryRangeMutationDto,
} from './job-position.dto';

interface SalaryRangeRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  group_code: string | null;
  class_code: string | null;
  starts_on: Date | string;
  ends_on: Date | string | null;
}

interface SalaryRangeLevelRow extends QueryResultRow {
  id: string;
  salary_range_id: string;
  code: string;
  name: string;
  description: string;
  class_number: number;
  level_number: number;
  base_salary: string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class SalaryRangeService {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<unknown[]> {
    const rows = await this.database.query<SalaryRangeRow>(
      `
      SELECT id::text, code, name, group_code, class_code, starts_on, ends_on
      FROM hr.salary_range
      ORDER BY code
      `,
    );
    return rows.map((row) => this.toRangeDto(row));
  }

  async create(input: SalaryRangeMutationDto): Promise<unknown> {
    return this.database.transaction(async (client) => {
      await this.assertRangeCode(client, input.code);
      const result = await client.query<SalaryRangeRow>(
        `
        INSERT INTO hr.salary_range (
          tenant_id, code, name, group_code, class_code, starts_on, ends_on, status
        ) VALUES (
          NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
          $1, $2, $3, $4, $5::date, $6::date, 'ACTIVE'
        )
        RETURNING id::text, code, name, group_code, class_code, starts_on, ends_on
        `,
        [
          input.code,
          input.name,
          input.groupCode ?? null,
          input.classCode ?? null,
          input.startsOn,
          input.endsOn ?? null,
        ],
      );
      return this.toRangeDto(result.rows[0]);
    });
  }

  async createLevel(input: SalaryRangeLevelMutationDto): Promise<unknown> {
    return this.database.transaction(async (client) => {
      await this.assertLevelKey(
        client,
        input.salaryRangeId,
        input.classNumber,
        input.levelNumber,
      );
      const result = await client.query<SalaryRangeLevelRow>(
        `
        INSERT INTO hr.salary_range_level (
          tenant_id, salary_range_id, code, name, description, class_number,
          level_number, level_number_fol02, base_salary, amount_override, status
        ) VALUES (
          NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
          $1::uuid, $2, $3, COALESCE($4, ''), $5, $6, $6, $7::numeric(14,2), $7::numeric(14,2), 'ACTIVE'
        )
        RETURNING id::text, salary_range_id::text, code, name, description,
          class_number, level_number_fol02 AS level_number, base_salary::text
        `,
        [
          input.salaryRangeId,
          input.code,
          input.name,
          input.description ?? '',
          input.classNumber,
          input.levelNumber,
          input.baseSalary,
        ],
      );
      return this.toLevelDto(result.rows[0]);
    });
  }

  async listLevels(salaryRangeId: string): Promise<unknown[]> {
    const rows = await this.database.query<SalaryRangeLevelRow>(
      `
      SELECT id::text, salary_range_id::text, code, name, description,
        class_number, level_number_fol02 AS level_number, base_salary::text
      FROM hr.salary_range_level
      WHERE salary_range_id = $1::uuid
      ORDER BY class_number, level_number_fol02
      `,
      [salaryRangeId],
    );
    return rows.map((row) => this.toLevelDto(row));
  }

  private async assertRangeCode(
    client: PoolClient,
    code: string,
  ): Promise<void> {
    const result = await client.query<CountRow>(
      'SELECT count(*)::text AS total FROM hr.salary_range WHERE code = $1',
      [code],
    );
    if (Number(result.rows[0]?.total ?? 0) > 0) {
      throw new ConflictException(
        'Salary range code must be unique per tenant.',
      );
    }
  }

  private async assertLevelKey(
    client: PoolClient,
    salaryRangeId: string,
    classNumber: number,
    levelNumber: number,
  ): Promise<void> {
    const result = await client.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.salary_range_level
      WHERE salary_range_id = $1::uuid
        AND class_number = $2
        AND level_number_fol02 = $3
      `,
      [salaryRangeId, classNumber, levelNumber],
    );
    if (Number(result.rows[0]?.total ?? 0) > 0) {
      throw new ConflictException(
        'Class and level must be unique in the salary range.',
      );
    }
  }

  private toRangeDto(row: SalaryRangeRow): Record<string, unknown> {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      groupCode: row.group_code,
      classCode: row.class_code,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
    };
  }

  private toLevelDto(row: SalaryRangeLevelRow): Record<string, unknown> {
    return {
      id: row.id,
      salaryRangeId: row.salary_range_id,
      code: row.code,
      name: row.name,
      description: row.description,
      classNumber: row.class_number,
      levelNumber: row.level_number,
      baseSalary: row.base_salary,
    };
  }
}

@Injectable()
export class SalaryRangeLevelService {
  constructor(private readonly salaryRangeService: SalaryRangeService) {}

  create(input: SalaryRangeLevelMutationDto): Promise<unknown> {
    return this.salaryRangeService.createLevel(input);
  }

  list(salaryRangeId: string): Promise<unknown[]> {
    return this.salaryRangeService.listLevels(salaryRangeId);
  }
}
