import { BadRequestException, Injectable } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { MassAdjustmentDto } from './salary-history.dto';

interface SalaryLevelRow extends QueryResultRow {
  id: string;
  salary_range_id: string;
  current_salary: string;
}

interface AdjustmentRow extends QueryResultRow {
  id: string;
  salary_range_level_id: string;
  vencimento_basico: string;
}

@Injectable()
export class SalaryHistoryService {
  constructor(private readonly database: DatabaseService) {}

  async applyMassAdjustment(input: MassAdjustmentDto): Promise<unknown> {
    const percent = Number(input.percentual);
    if (!Number.isFinite(percent)) {
      throw new BadRequestException('percentual must be numeric.');
    }
    const scope = input.escopo ?? {};
    if (!scope.careerPlanId && !scope.salaryRangeId) {
      throw new BadRequestException(
        'escopo must include careerPlanId or salaryRangeId.',
      );
    }

    return this.database.transaction(async (client) => {
      const levels = await this.findScopeLevels(client, input);
      if (levels.length === 0) {
        throw new BadRequestException(
          'No salary range levels found for the adjustment scope.',
        );
      }

      const affected: AdjustmentRow[] = [];
      for (const level of levels) {
        const inserted = await this.applyLevelAdjustment(
          client,
          level,
          percent,
          input,
        );
        affected.push(inserted);
      }

      const lastAdjustmentId = affected.at(-1)?.id ?? null;
      await client.query(
        `
        INSERT INTO public.system_parameter (
          tenant_id, key, value, description, module_key
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          'global:reajuste.data_base_padrao',
          jsonb_build_object(
            'month', EXTRACT(MONTH FROM $1::date)::integer,
            'day', EXTRACT(DAY FROM $1::date)::integer,
            'lastAdjustmentId', $2::text
          ),
          'Default annual salary adjustment date and last applied adjustment link.',
          'global'
        )
        ON CONFLICT (tenant_id, key) DO UPDATE
        SET value = EXCLUDED.value,
          description = EXCLUDED.description,
          module_key = EXCLUDED.module_key,
          updated_at = now()
        `,
        [input.vigenciaInicio, lastAdjustmentId],
      );

      return {
        vigenciaInicio: input.vigenciaInicio,
        percentual: input.percentual,
        leiReferencia: input.leiReferencia,
        affectedCount: affected.length,
        affectedLevels: affected.map((row) => ({
          id: row.id,
          salaryRangeLevelId: row.salary_range_level_id,
          baseSalary: row.vencimento_basico,
        })),
      };
    });
  }

  async timeline(salaryRangeLevelId: string): Promise<unknown[]> {
    const rows = await this.database.query<QueryResultRow>(
      `
      SELECT
        id::text,
        salary_range_level_id::text AS "salaryRangeLevelId",
        vigencia_inicio AS "vigenciaInicio",
        vigencia_fim AS "vigenciaFim",
        vencimento_basico::text AS "vencimentoBasico",
        motivo,
        lei_referencia AS "leiReferencia"
      FROM hr.salary_level_history
      WHERE salary_range_level_id = $1::uuid
      ORDER BY vigencia_inicio DESC
      `,
      [salaryRangeLevelId],
    );
    return rows;
  }

  private async findScopeLevels(
    client: PoolClient,
    input: MassAdjustmentDto,
  ): Promise<SalaryLevelRow[]> {
    const result = await client.query<SalaryLevelRow>(
      `
      SELECT
        srl.id::text,
        srl.salary_range_id::text,
        COALESCE(
          avaliacao.fn_get_vencimento_vigente(srl.id, ($3::date - INTERVAL '1 day')::date),
          srl.base_salary,
          0
        )::text AS current_salary
      FROM hr.salary_range_level srl
      JOIN hr.salary_range sr ON sr.id = srl.salary_range_id
      WHERE ($1::uuid IS NULL OR sr.career_plan_id = $1::uuid)
        AND ($2::uuid IS NULL OR sr.id = $2::uuid)
      ORDER BY sr.code, srl.class_number, srl.level_number_fol02
      `,
      [
        input.escopo.careerPlanId ?? null,
        input.escopo.salaryRangeId ?? null,
        input.vigenciaInicio,
      ],
    );
    return result.rows;
  }

  private async applyLevelAdjustment(
    client: PoolClient,
    level: SalaryLevelRow,
    percent: number,
    input: MassAdjustmentDto,
  ): Promise<AdjustmentRow> {
    await client.query(
      `
      UPDATE hr.salary_level_history
      SET vigencia_fim = ($2::date - INTERVAL '1 day')::date
      WHERE salary_range_level_id = $1::uuid
        AND vigencia_inicio < $2::date
        AND (vigencia_fim IS NULL OR vigencia_fim >= $2::date)
      `,
      [level.id, input.vigenciaInicio],
    );

    const result = await client.query<AdjustmentRow>(
      `
      INSERT INTO hr.salary_level_history (
        tenant_id,
        employee_id,
        salary_range_level_id,
        salary_reference_id,
        level_code,
        level_description,
        adjustment_amount,
        effective_on,
        vigencia_inicio,
        vigencia_fim,
        vencimento_basico,
        motivo,
        lei_referencia
      )
      SELECT
        srl.tenant_id,
        NULL::uuid,
        srl.id,
        srl.salary_reference_id,
        srl.code,
        srl.name,
        round(($2::numeric(14,2) * ($3::numeric(18,6) / 100)), 2)::numeric(14,2),
        $4::date,
        $4::date,
        NULL::date,
        round(($2::numeric(14,2) * (1 + ($3::numeric(18,6) / 100))), 2)::numeric(14,2),
        $5::hr.salary_history_reason,
        $6
      FROM hr.salary_range_level srl
      WHERE srl.id = $1::uuid
      RETURNING id::text, salary_range_level_id::text, vencimento_basico::text
      `,
      [
        level.id,
        level.current_salary,
        percent.toFixed(6),
        input.vigenciaInicio,
        input.motivo ?? 'reajuste_data_base',
        input.leiReferencia,
      ],
    );
    const inserted = result.rows[0];

    await client.query(
      `
      UPDATE hr.salary_range_level
      SET base_salary = $2::numeric(14,2),
        amount_override = $2::numeric(14,2),
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [level.id, inserted.vencimento_basico],
    );

    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'UPDATE',
        'avaliacao.salary_history',
        $1,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'hr.salary_level_history',
        NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object(
          'event', 'avaliacao.salary_history.mass_adjustment',
          'salaryRangeLevelId', $2,
          'vigenciaInicio', $3,
          'percentual', $4,
          'leiReferencia', $5,
          'vencimentoBasico', $6
        ),
        NULL::text,
        NULL::text,
        NULL::text
      )
      `,
      [
        inserted.id,
        level.id,
        input.vigenciaInicio,
        input.percentual,
        input.leiReferencia,
        inserted.vencimento_basico,
      ],
    );

    return inserted;
  }
}
