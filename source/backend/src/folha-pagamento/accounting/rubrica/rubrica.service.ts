import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../../common/pagination/paged-response';
import { DatabaseService } from '../../../database/database.service';
import { FormulaCompilerService } from '../../../payroll-engine/formula-compiler.service';
import { PayrollEngineService } from '../../../payroll-engine/payroll-engine.service';
import {
  JobPositionRubricaMutationDto,
  RubricaAttributeDto,
  RubricaCompileDto,
  RubricaMutationDto,
  RubricaPreviewDto,
  RubricaType,
} from './rubrica.dto';

interface CountRow extends QueryResultRow {
  total: string;
}

interface RubricaRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  kind: string;
  taxable: boolean;
  active: boolean;
  incidences: Record<string, unknown>;
  starts_on: Date | string;
  ends_on: Date | string | null;
  formula_alias: string | null;
  formula_expression: string | null;
  formula_dependencies: string[] | null;
  formula_version: number;
  formula_ready: boolean;
  formula_error: string | null;
  esocial_code: string | null;
  official_rubric_code: string | null;
  attributes: RubricaAttributeRecord[] | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface LinkRow extends QueryResultRow {
  id: string;
  job_position_id: string;
  job_position_code: string | null;
  job_position_name: string | null;
  rubrica_id: string;
  rubrica_code: string | null;
  rubrica_description: string | null;
  starts_on: Date | string | null;
  ends_on: Date | string | null;
  application_condition: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PreviewRow extends QueryResultRow {
  amount: string | null;
}

export interface RubricaAttributeRecord {
  id: string;
  name: string;
  type: string;
  defaultValue: string | null;
  required: boolean;
}

export interface RubricaRecord {
  id: string;
  code: string;
  description: string;
  type: RubricaType;
  taxable: boolean;
  active: boolean;
  incidences: Record<string, unknown>;
  startsOn: string;
  endsOn: string | null;
  formulaAlias: string | null;
  formulaExpression: string | null;
  formulaDependencies: string[];
  formulaReady: boolean;
  formulaError: string | null;
  esocialCode: string | null;
  officialRubricCode: string | null;
  attributes: RubricaAttributeRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface RubricaCompileResult {
  ready: boolean;
  error: string | null;
  dependencies: string[];
}

export interface RubricaPreviewResult {
  rubricaId: string;
  employeeId: string;
  competence: string;
  amount: string | null;
  attributes: Record<string, unknown>;
}

export interface JobPositionRubricaRecord {
  id: string;
  jobPositionId: string;
  jobPositionCode: string | null;
  jobPositionName: string | null;
  rubricaId: string;
  rubricaCode: string | null;
  rubricaDescription: string | null;
  startsOn: string | null;
  endsOn: string | null;
  applicationCondition: string;
  createdAt: string;
  updatedAt: string;
}

const KIND_BY_TYPE: Record<RubricaType, string> = {
  provento: 'EARNING',
  desconto: 'DEDUCTION',
  informativa: 'INFORMATION',
  base: 'BASE',
};

const TYPE_BY_KIND: Record<string, RubricaType> = {
  EARNING: 'provento',
  DEDUCTION: 'desconto',
  INFORMATION: 'informativa',
  BASE: 'base',
};

@Injectable()
export class RubricaService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly payrollEngineService: PayrollEngineService,
    @Optional()
    private readonly formulaCompilerService?: FormulaCompilerService,
  ) {}

  async listRubricas(
    query: DomainListQueryDto & { type?: RubricaType; incidence?: string },
  ): Promise<PagedResponse<RubricaRecord>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;
    const kind = query.type ? KIND_BY_TYPE[query.type] : null;
    const incidence = query.incidence?.trim() || null;

    const countRows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM payroll.payroll_earning_deduction ped
      WHERE ($1 = '%%' OR lower(concat_ws(' ', ped.code, ped.description, ped.kind::text)) LIKE $1)
        AND ($2::text IS NULL OR ped.kind = $2::"PayrollEntryKind")
        AND ($3::text IS NULL OR ped.incidences ? $3)
      `,
      [searchTerm, kind, incidence],
    );

    const rows = await this.databaseService.query<RubricaRow>(
      this.rubricaSelectSql(`
        WHERE ($1 = '%%' OR lower(concat_ws(' ', ped.code, ped.description, ped.kind::text)) LIKE $1)
          AND ($2::text IS NULL OR ped.kind = $2::"PayrollEntryKind")
          AND ($3::text IS NULL OR ped.incidences ? $3)
        ORDER BY ped.code
        LIMIT $4 OFFSET $5
      `),
      [searchTerm, kind, incidence, pageSize, offset],
    );
    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toRubrica(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async getRubrica(id: string): Promise<RubricaRecord> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RubricaRow>(
      this.rubricaSelectSql('WHERE ped.id = $1::uuid'),
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Rubrica not found');
    }
    return this.toRubrica(row);
  }

  async createRubrica(input: RubricaMutationDto): Promise<RubricaRecord> {
    this.ensureDatabase();
    const created = await this.databaseService.transaction(async (client) => {
      const row = await this.insertRubrica(client, input);
      await this.replaceAttributes(client, row.id, input.attributes ?? []);
      return this.reloadRubrica(client, row.id);
    });
    return this.recompileIfFormula(created);
  }

  async updateRubrica(
    id: string,
    input: RubricaMutationDto,
  ): Promise<RubricaRecord> {
    this.ensureDatabase();
    const updated = await this.databaseService.transaction(async (client) => {
      const rows = await client.query<RubricaRow>(
        `
        UPDATE payroll.payroll_earning_deduction
        SET
          code = $2,
          description = $3,
          kind = $4::"PayrollEntryKind",
          taxable = $5,
          active = $6,
          incidences = $7::jsonb,
          starts_on = $8::date,
          ends_on = $9::date,
          formula_alias = NULLIF($10, ''),
          formula_expression = NULLIF($11, ''),
          formula_dependencies = $12::text[],
          esocial_code = NULLIF($13, ''),
          official_rubric_code = NULLIF($14, ''),
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text
        `,
        this.mutationValues(id, input),
      );
      const row = rows.rows[0];
      if (!row) {
        throw new NotFoundException('Rubrica not found');
      }
      await this.replaceAttributes(client, row.id, input.attributes ?? []);
      return this.reloadRubrica(client, row.id);
    });
    return this.recompileIfFormula(updated);
  }

  async deactivateRubrica(id: string): Promise<RubricaRecord> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RubricaRow>(
      `
      UPDATE payroll.payroll_earning_deduction
      SET active = false, updated_at = now()
      WHERE id = $1::uuid
      RETURNING id::text
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Rubrica not found');
    }
    return this.getRubrica(row.id);
  }

  async compileFormula(
    input: RubricaCompileDto,
  ): Promise<RubricaCompileResult> {
    if (this.formulaCompilerService) {
      const result = await this.formulaCompilerService.validateFormula(
        input.expression,
      );
      return {
        ready: result.ready,
        error: result.error,
        dependencies: result.dependencies,
      };
    }
    return this.payrollEngineService.compileAndValidate(
      input.expression,
      input.dependencies ?? [],
    );
  }

  async recompileRubrica(id: string): Promise<RubricaRecord> {
    this.ensureDatabase();
    if (!this.formulaCompilerService) {
      throw new ServiceUnavailableException(
        'Formula compiler is not configured',
      );
    }
    await this.formulaCompilerService.compileEarningDeduction(id);
    return this.getRubrica(id);
  }

  async previewRubrica(
    id: string,
    input: RubricaPreviewDto,
  ): Promise<RubricaPreviewResult> {
    this.ensureDatabase();
    const rows = await this.databaseService.transaction(async (client) => {
      const result = await client.query<PreviewRow>(
        `
        SELECT payroll_calc.evaluate_earning_deduction(
          $1::uuid,
          $2::uuid,
          $3::integer,
          $4::integer
        )::text AS amount
        `,
        [id, input.employeeId, input.competenceMonth, input.competenceYear],
      );
      return result.rows;
    });
    return {
      rubricaId: id,
      employeeId: input.employeeId,
      competence: `${input.competenceYear}-${String(input.competenceMonth).padStart(2, '0')}`,
      amount: rows[0]?.amount ?? null,
      attributes: input.attributes ?? {},
    };
  }

  private async recompileIfFormula(
    rubrica: RubricaRecord,
  ): Promise<RubricaRecord> {
    if (!rubrica.formulaExpression?.trim() || !this.formulaCompilerService) {
      return rubrica;
    }
    return this.recompileRubrica(rubrica.id);
  }

  async listJobPositionRubricas(): Promise<JobPositionRubricaRecord[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<LinkRow>(
      `
      SELECT
        jpe.id::text AS id,
        jpe.job_position_id::text AS job_position_id,
        jp.code AS job_position_code,
        jp.name AS job_position_name,
        jpe.earning_deduction_id::text AS rubrica_id,
        ped.code AS rubrica_code,
        ped.description AS rubrica_description,
        jpe.starts_on,
        jpe.ends_on,
        jpe.application_condition,
        jpe.created_at,
        jpe.updated_at
      FROM payroll.job_position_earning jpe
      JOIN hr.job_position jp ON jp.id = jpe.job_position_id
      JOIN payroll.payroll_earning_deduction ped ON ped.id = jpe.earning_deduction_id
      WHERE jpe.status = 'ACTIVE'::"RecordStatus"
      ORDER BY jp.code, ped.code
      `,
    );
    return rows.map((row) => this.toJobPositionRubrica(row));
  }

  async createJobPositionRubrica(
    input: JobPositionRubricaMutationDto,
  ): Promise<JobPositionRubricaRecord> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<LinkRow>(
      `
      INSERT INTO payroll.job_position_earning (
        tenant_id,
        job_position_id,
        earning_deduction_id,
        starts_on,
        ends_on,
        application_condition,
        status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::date,
        $4::date,
        $5,
        'ACTIVE'::"RecordStatus"
      )
      ON CONFLICT (tenant_id, job_position_id, earning_deduction_id) DO UPDATE
      SET
        starts_on = EXCLUDED.starts_on,
        ends_on = EXCLUDED.ends_on,
        application_condition = EXCLUDED.application_condition,
        status = 'ACTIVE'::"RecordStatus",
        updated_at = now()
      RETURNING id::text
      `,
      [
        input.jobPositionId,
        input.rubricaId,
        input.startsOn,
        input.endsOn ?? null,
        input.applicationCondition?.trim() ?? '',
      ],
    );
    return this.getJobPositionRubrica(rows[0]?.id ?? '');
  }

  private async getJobPositionRubrica(
    id: string,
  ): Promise<JobPositionRubricaRecord> {
    const rows = await this.databaseService.query<LinkRow>(
      `
      SELECT
        jpe.id::text AS id,
        jpe.job_position_id::text AS job_position_id,
        jp.code AS job_position_code,
        jp.name AS job_position_name,
        jpe.earning_deduction_id::text AS rubrica_id,
        ped.code AS rubrica_code,
        ped.description AS rubrica_description,
        jpe.starts_on,
        jpe.ends_on,
        jpe.application_condition,
        jpe.created_at,
        jpe.updated_at
      FROM payroll.job_position_earning jpe
      JOIN hr.job_position jp ON jp.id = jpe.job_position_id
      JOIN payroll.payroll_earning_deduction ped ON ped.id = jpe.earning_deduction_id
      WHERE jpe.id = $1::uuid
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Job-position rubrica link not found');
    }
    return this.toJobPositionRubrica(row);
  }

  private async insertRubrica(
    client: PoolClient,
    input: RubricaMutationDto,
  ): Promise<{ id: string }> {
    const rows = await client.query<{ id: string }>(
      `
      INSERT INTO payroll.payroll_earning_deduction (
        tenant_id,
        code,
        description,
        kind,
        taxable,
        active,
        incidences,
        starts_on,
        ends_on,
        formula_alias,
        formula_expression,
        formula_dependencies,
        esocial_code,
        official_rubric_code
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1,
        $2,
        $3::"PayrollEntryKind",
        $4,
        $5,
        $6::jsonb,
        $7::date,
        $8::date,
        NULLIF($9, ''),
        NULLIF($10, ''),
        $11::text[],
        NULLIF($12, ''),
        NULLIF($13, '')
      )
      RETURNING id::text
      `,
      this.mutationValues(undefined, input).slice(1),
    );
    return rows.rows[0];
  }

  private async replaceAttributes(
    client: PoolClient,
    rubricaId: string,
    attributes: RubricaAttributeDto[],
  ): Promise<void> {
    await client.query(
      `DELETE FROM payroll.formula_attribute WHERE earning_deduction_id = $1::uuid`,
      [rubricaId],
    );
    for (const attribute of attributes) {
      const name = attribute.name.trim();
      if (!name) {
        throw new BadRequestException('Formula attribute name is required');
      }
      await client.query(
        `
        INSERT INTO payroll.formula_attribute (
          tenant_id,
          earning_deduction_id,
          code,
          description,
          name,
          data_type,
          value_type,
          default_value,
          required,
          source_scope,
          expression_hint,
          status
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2,
          $3,
          $3,
          $4,
          $4::payroll.formula_attribute_value_type,
          $5,
          $6,
          'rubrica',
          '',
          'ACTIVE'::"RecordStatus"
        )
        `,
        [
          rubricaId,
          name.toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
          name,
          attribute.type,
          attribute.defaultValue ?? null,
          attribute.required ?? false,
        ],
      );
    }
  }

  private async reloadRubrica(
    client: PoolClient,
    id: string,
  ): Promise<RubricaRecord> {
    const rows = await client.query<RubricaRow>(
      this.rubricaSelectSql('WHERE ped.id = $1::uuid'),
      [id],
    );
    const row = rows.rows[0];
    if (!row) {
      throw new NotFoundException('Rubrica not found');
    }
    return this.toRubrica(row);
  }

  private mutationValues(
    id: string | undefined,
    input: RubricaMutationDto,
  ): unknown[] {
    const values = [
      id ?? '',
      input.code.trim(),
      input.description.trim(),
      KIND_BY_TYPE[input.type],
      input.taxable ?? false,
      input.active ?? true,
      JSON.stringify(input.incidences ?? {}),
      input.startsOn ?? '1900-01-01',
      input.endsOn ?? null,
      input.formulaAlias?.trim() ?? '',
      input.formulaExpression?.trim() ?? '',
      input.formulaDependencies ?? [],
      input.esocialCode?.trim() ?? '',
      input.officialRubricCode?.trim() ?? '',
    ];
    if (!values[1] || !values[2]) {
      throw new BadRequestException(
        'Rubrica code and description are required',
      );
    }
    return values;
  }

  private rubricaSelectSql(whereSql: string): string {
    return `
      SELECT
        ped.id::text AS id,
        ped.code,
        ped.description,
        ped.kind::text AS kind,
        ped.taxable,
        ped.active,
        ped.incidences,
        ped.starts_on,
        ped.ends_on,
        ped.formula_alias,
        ped.formula_expression,
        ped.formula_dependencies,
        ped.formula_version,
        ped.formula_ready,
        ped.formula_error,
        ped.esocial_code,
        ped.official_rubric_code,
        ped.created_at,
        ped.updated_at,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', fa.id::text,
              'name', fa.name,
              'type', fa.value_type::text,
              'defaultValue', fa.default_value,
              'required', fa.required
            )
            ORDER BY fa.name
          ) FILTER (WHERE fa.id IS NOT NULL),
          '[]'::jsonb
        ) AS attributes
      FROM payroll.payroll_earning_deduction ped
      LEFT JOIN payroll.formula_attribute fa ON fa.earning_deduction_id = ped.id
      ${whereSql}
      GROUP BY ped.id
    `;
  }

  private toRubrica(row: RubricaRow): RubricaRecord {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      type: TYPE_BY_KIND[row.kind] ?? 'informativa',
      taxable: row.taxable,
      active: row.active,
      incidences: row.incidences ?? {},
      startsOn: this.toDate(row.starts_on),
      endsOn: row.ends_on ? this.toDate(row.ends_on) : null,
      formulaAlias: row.formula_alias,
      formulaExpression: row.formula_expression,
      formulaDependencies: row.formula_dependencies ?? [],
      formulaReady: row.formula_ready,
      formulaError: row.formula_error,
      esocialCode: row.esocial_code,
      officialRubricCode: row.official_rubric_code,
      attributes: row.attributes ?? [],
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toJobPositionRubrica(row: LinkRow): JobPositionRubricaRecord {
    return {
      id: row.id,
      jobPositionId: row.job_position_id,
      jobPositionCode: row.job_position_code,
      jobPositionName: row.job_position_name,
      rubricaId: row.rubrica_id,
      rubricaCode: row.rubrica_code,
      rubricaDescription: row.rubrica_description,
      startsOn: row.starts_on ? this.toDate(row.starts_on) : null,
      endsOn: row.ends_on ? this.toDate(row.ends_on) : null,
      applicationCondition: row.application_condition,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private toDate(value: Date | string): string {
    return (value instanceof Date ? value : new Date(value))
      .toISOString()
      .slice(0, 10);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }
}
