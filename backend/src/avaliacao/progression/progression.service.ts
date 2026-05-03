import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { ProgressionSimulationDto } from './progression.dto';

interface EligibilityRow extends QueryResultRow {
  employee_id: string;
  registration: string;
  employee_name: string;
  hired_on: Date | string | null;
  current_level_id: string | null;
  current_class_number: number | null;
  current_level_number: number | null;
  current_salary: string | null;
  next_level_id: string | null;
  next_class_number: number | null;
  next_level_number: number | null;
  next_salary: string | null;
  approved_evaluation_id: string | null;
  approved_evaluation_on: Date | string | null;
  last_progression_on: Date | string | null;
  interstice_reference_on: Date | string | null;
  interstice_met: boolean;
}

interface ProgressionRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string | null;
  employee_name: string | null;
  progression_type: string;
  status: string;
  data_efeito: Date | string;
  source_salary_range_level_id: string | null;
  target_salary_range_level_id: string | null;
  source_salary: string | null;
  target_salary: string | null;
  applied_at: Date | string | null;
  created_at: Date | string;
}

interface IdOnlyRow extends QueryResultRow {
  id: string;
}

interface SalaryImpactRow extends QueryResultRow {
  source_salary: string;
  target_salary: string;
  net_delta: string;
  formula_amount: string | null;
}

interface ApplyRow extends QueryResultRow {
  id: string;
  employee_id: string;
  status: string;
  applied_at: Date | string | null;
}

@Injectable()
export class EligibilityService {
  constructor(private readonly database: DatabaseService) {}

  checkInterstice(employeeId: string, effectDate?: string) {
    return this.database.transaction((client) =>
      this.checkIntersticeWithClient(client, employeeId, effectDate),
    );
  }

  async checkIntersticeWithClient(
    client: PoolClient,
    employeeId: string,
    effectDate?: string,
  ): Promise<Record<string, unknown>> {
    const row = await this.loadEligibility(client, employeeId, effectDate);
    if (!row) throw new NotFoundException('Employee not found.');
    return this.toEligibilityDto(row);
  }

  async assertEligible(
    client: PoolClient,
    employeeId: string,
    effectDate: string,
  ): Promise<EligibilityRow> {
    const row = await this.loadEligibility(client, employeeId, effectDate);
    if (!row) throw new NotFoundException('Employee not found.');
    if (!row.interstice_met) {
      throw new BadRequestException(
        'Minimum progression interstice is not met.',
      );
    }
    if (!row.approved_evaluation_id) {
      throw new BadRequestException(
        'An approved performance evaluation is required.',
      );
    }
    if (!row.current_level_id || !row.next_level_id) {
      throw new BadRequestException('No next salary range level is available.');
    }
    return row;
  }

  private async loadEligibility(
    client: PoolClient,
    employeeId: string,
    effectDate?: string,
  ): Promise<EligibilityRow | undefined> {
    const result = await client.query<EligibilityRow>(
      `
      WITH employee_base AS (
        SELECT
          e.id,
          e.registration,
          e.name,
          e.hired_on,
          COALESCE(e.salary_range_level_id, first_level.id) AS current_level_id
        FROM hr.employee e
        LEFT JOIN hr.job_position jp ON jp.id = e.job_position_id
        LEFT JOIN LATERAL (
          SELECT srl.id
          FROM hr.salary_range_level srl
          WHERE srl.salary_range_id = jp.salary_range_id
            AND srl.tenant_id = e.tenant_id
          ORDER BY srl.class_number, srl.level_number_fol02
          LIMIT 1
        ) first_level ON true
        WHERE e.id = $1::uuid
          AND e.tenant_id = public.sgp_current_tenant_uuid()
      ), current_level AS (
        SELECT
          eb.*,
          srl.salary_range_id,
          srl.class_number,
          srl.level_number_fol02,
          avaliacao.fn_get_vencimento_vigente(srl.id, COALESCE($2::date, CURRENT_DATE)) AS current_salary
        FROM employee_base eb
        LEFT JOIN hr.salary_range_level srl ON srl.id = eb.current_level_id
      ), next_level AS (
        SELECT nl.*
        FROM current_level cl
        JOIN LATERAL (
          SELECT srl.id, srl.class_number, srl.level_number_fol02,
            avaliacao.fn_get_vencimento_vigente(srl.id, COALESCE($2::date, CURRENT_DATE)) AS next_salary
          FROM hr.salary_range_level srl
          WHERE srl.salary_range_id = cl.salary_range_id
            AND (srl.class_number, srl.level_number_fol02) >
              (cl.class_number, cl.level_number_fol02)
          ORDER BY srl.class_number, srl.level_number_fol02
          LIMIT 1
        ) nl ON true
      ), approved_eval AS (
        SELECT pe.id, pe.evaluated_on
        FROM hr.performance_evaluation pe
        WHERE pe.employee_id = $1::uuid
          AND pe.tenant_id = public.sgp_current_tenant_uuid()
          AND pe.status = 'APPROVED'::"PerformanceEvaluationStatus"
        ORDER BY pe.evaluated_on DESC
        LIMIT 1
      ), last_progression AS (
        SELECT mp.data_efeito
        FROM hr.merit_progression mp
        WHERE mp.employee_id = $1::uuid
          AND mp.tenant_id = public.sgp_current_tenant_uuid()
          AND mp.status = 'applied'::hr.progression_status
        ORDER BY mp.data_efeito DESC
        LIMIT 1
      )
      SELECT
        cl.id::text AS employee_id,
        cl.registration,
        cl.name AS employee_name,
        cl.hired_on,
        cl.current_level_id::text,
        cl.class_number AS current_class_number,
        cl.level_number_fol02 AS current_level_number,
        cl.current_salary::text,
        nl.id::text AS next_level_id,
        nl.class_number AS next_class_number,
        nl.level_number_fol02 AS next_level_number,
        nl.next_salary::text,
        ae.id::text AS approved_evaluation_id,
        ae.evaluated_on AS approved_evaluation_on,
        lp.data_efeito AS last_progression_on,
        COALESCE(lp.data_efeito, cl.hired_on) AS interstice_reference_on,
        COALESCE($2::date, CURRENT_DATE) >=
          (COALESCE(lp.data_efeito, cl.hired_on, DATE '1900-01-01') + INTERVAL '18 months')::date
          AS interstice_met
      FROM current_level cl
      LEFT JOIN next_level nl ON true
      LEFT JOIN approved_eval ae ON true
      LEFT JOIN last_progression lp ON true
      `,
      [employeeId, effectDate ?? null],
    );
    return result.rows[0];
  }

  private toEligibilityDto(row: EligibilityRow): Record<string, unknown> {
    return {
      employeeId: row.employee_id,
      registration: row.registration,
      name: row.employee_name,
      eligible:
        row.interstice_met &&
        Boolean(row.approved_evaluation_id) &&
        Boolean(row.next_level_id),
      intersticeMet: row.interstice_met,
      intersticeReferenceOn: row.interstice_reference_on,
      approvedEvaluationId: row.approved_evaluation_id,
      approvedEvaluationOn: row.approved_evaluation_on,
      currentLevel: row.current_level_id
        ? {
            id: row.current_level_id,
            classNumber: row.current_class_number,
            levelNumber: row.current_level_number,
            salary: row.current_salary,
          }
        : null,
      nextLevel: row.next_level_id
        ? {
            id: row.next_level_id,
            classNumber: row.next_class_number,
            levelNumber: row.next_level_number,
            salary: row.next_salary,
          }
        : null,
    };
  }
}

@Injectable()
export class ProgressionSimulationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly eligibility: EligibilityService,
  ) {}

  list(status?: string): Promise<Record<string, unknown>[]> {
    return this.database
      .query<ProgressionRow>(
        `
      SELECT
        mp.id::text,
        mp.employee_id::text,
        e.registration,
        e.name AS employee_name,
        mp.progression_type::text,
        mp.status::text,
        mp.data_efeito,
        mp.source_salary_range_level_id::text,
        mp.target_salary_range_level_id::text,
        CASE WHEN mp.source_salary_range_level_id IS NOT NULL
          THEN avaliacao.fn_get_vencimento_vigente(mp.source_salary_range_level_id, mp.data_efeito)::text
          ELSE NULL
        END AS source_salary,
        CASE WHEN mp.target_salary_range_level_id IS NOT NULL
          THEN avaliacao.fn_get_vencimento_vigente(mp.target_salary_range_level_id, mp.data_efeito)::text
          ELSE NULL
        END AS target_salary,
        mp.applied_at,
        mp.created_at
      FROM hr.merit_progression mp
      JOIN hr.employee e ON e.id = mp.employee_id
      WHERE ($1::hr.progression_status IS NULL OR mp.status = $1::hr.progression_status)
      ORDER BY mp.created_at DESC
      `,
        [status ?? null],
      )
      .then((rows) => rows.map((row) => this.toProgressionDto(row)));
  }

  async simulate(
    input: ProgressionSimulationDto,
  ): Promise<Record<string, unknown>> {
    return this.database.transaction(async (client) => {
      const eligibility = await this.eligibility.assertEligible(
        client,
        input.employeeId,
        input.effectDate,
      );
      const targetLevelId =
        input.targetSalaryRangeLevelId ?? eligibility.next_level_id;
      if (!targetLevelId) {
        throw new BadRequestException('targetSalaryRangeLevelId is required.');
      }

      const salaries = await this.resolveSalaryImpact(
        client,
        eligibility.current_level_id as string,
        targetLevelId,
        input.effectDate,
        input.employeeId,
        input.earningDeductionId,
      );

      const progression = await client.query<IdOnlyRow>(
        `
        INSERT INTO hr.merit_progression (
          tenant_id,
          employee_id,
          performance_evaluation_id,
          source_salary_range_level_id,
          target_salary_range_level_id,
          effective_on,
          data_efeito,
          appointment_act,
          kind,
          progression_type,
          status,
          administrative_process_id,
          justification,
          approved_by_ref
        ) VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          $5::date,
          $5::date,
          COALESCE($6, ''),
          'MERIT'::"ProgressionKind",
          $7::hr.progression_type,
          'simulated'::hr.progression_status,
          $8::uuid,
          COALESCE($9, ''),
          NULLIF(current_setting('app.current_login', true), '')
        )
        RETURNING id::text
        `,
        [
          input.employeeId,
          input.performanceEvaluationId ?? eligibility.approved_evaluation_id,
          eligibility.current_level_id,
          targetLevelId,
          input.effectDate,
          input.appointmentAct ?? '',
          input.progressionType ?? 'merit_horizontal',
          input.administrativeProcessId ?? null,
          input.justification ?? '',
        ],
      );
      const progressionId = String(progression.rows[0]!.id);
      const simulation = await client.query<IdOnlyRow>(
        `
        INSERT INTO hr.salary_simulation (
          tenant_id,
          employee_id,
          progression_id,
          scenario,
          result_json,
          created_by_ref
        ) VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2::uuid,
          'functional_progression',
          $3::jsonb,
          NULLIF(current_setting('app.current_login', true), '')
        )
        RETURNING id::text
        `,
        [
          input.employeeId,
          progressionId,
          JSON.stringify({
            event: 'avaliacao.progressao.simulated',
            effectDate: input.effectDate,
            sourceSalaryRangeLevelId: eligibility.current_level_id,
            targetSalaryRangeLevelId: targetLevelId,
            ...salaries,
          }),
        ],
      );
      await this.appendAudit(client, 'CREATE', progressionId, {
        event: 'avaliacao.progressao.simulated',
        simulationId: simulation.rows[0]!.id,
        ...salaries,
      });
      return {
        progressionId,
        simulationId: simulation.rows[0]!.id,
        ...salaries,
      };
    });
  }

  private async resolveSalaryImpact(
    client: PoolClient,
    sourceLevelId: string,
    targetLevelId: string,
    effectDate: string,
    employeeId: string,
    earningDeductionId?: string,
  ): Promise<Record<string, unknown>> {
    const result = await client.query<SalaryImpactRow>(
      `
      SELECT
        avaliacao.fn_get_vencimento_vigente($1::uuid, $3::date)::text AS source_salary,
        avaliacao.fn_get_vencimento_vigente($2::uuid, $3::date)::text AS target_salary,
        (
          avaliacao.fn_get_vencimento_vigente($2::uuid, $3::date)
          - avaliacao.fn_get_vencimento_vigente($1::uuid, $3::date)
        )::numeric(14,2)::text AS net_delta,
        CASE WHEN $4::uuid IS NULL THEN NULL
          ELSE payroll_calc.evaluate_earning_deduction(
            $4::uuid,
            $5::uuid,
            EXTRACT(MONTH FROM $3::date)::integer,
            EXTRACT(YEAR FROM $3::date)::integer
          )::text
        END AS formula_amount
      `,
      [
        sourceLevelId,
        targetLevelId,
        effectDate,
        earningDeductionId ?? null,
        employeeId,
      ],
    );
    const row = result.rows[0]!;
    return {
      sourceSalary: row.source_salary,
      targetSalary: row.target_salary,
      netDelta: row.net_delta,
      formulaAmount: row.formula_amount,
      salaryResolver: 'avaliacao.fn_get_vencimento_vigente',
      formulaEvaluator: 'payroll_calc.evaluate_earning_deduction',
    };
  }

  private async appendAudit(
    client: PoolClient,
    action: 'CREATE' | 'UPDATE',
    id: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        $1, 'avaliacao.progressao', $2, NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'hr.merit_progression', NULLIF(current_setting('app.request_id', true), ''),
        $3::jsonb,
        NULL::text, NULL::text, NULL::text
      )
      `,
      [action, id, JSON.stringify(payload)],
    );
  }

  private toProgressionDto(row: ProgressionRow): Record<string, unknown> {
    return {
      id: row.id,
      employeeId: row.employee_id,
      registration: row.registration,
      name: row.employee_name,
      progressionType: row.progression_type,
      status: row.status,
      effectDate: row.data_efeito,
      sourceSalaryRangeLevelId: row.source_salary_range_level_id,
      targetSalaryRangeLevelId: row.target_salary_range_level_id,
      sourceSalary: row.source_salary,
      targetSalary: row.target_salary,
      appliedAt: row.applied_at,
      createdAt: row.created_at,
    };
  }
}

@Injectable()
export class ProgressionApplyService {
  constructor(private readonly database: DatabaseService) {}

  async apply(id: string): Promise<Record<string, unknown>> {
    return this.database.transaction(async (client) => {
      const current = await client.query<QueryResultRow>(
        `
        SELECT id::text, status::text
        FROM hr.merit_progression
        WHERE id = $1::uuid
          AND tenant_id = public.sgp_current_tenant_uuid()
        FOR UPDATE
        `,
        [id],
      );
      const currentRow = current.rows[0];
      if (!currentRow) throw new NotFoundException('Progression not found.');
      if (currentRow.status === 'applied') {
        throw new ConflictException('Progression is already applied.');
      }
      if (currentRow.status === 'revoked') {
        throw new ConflictException('Revoked progression cannot be applied.');
      }

      const updated = await client.query<ApplyRow>(
        `
        UPDATE hr.merit_progression
        SET status = 'applied'::hr.progression_status,
          applied_at = now(),
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text, employee_id::text, status::text, applied_at
        `,
        [id],
      );
      await client.query(
        `
        SELECT public.sgp_append_audit_event(
          'UPDATE', 'avaliacao.progressao', $1, NULL::uuid,
          NULLIF(current_setting('app.current_user_sub', true), ''),
          NULLIF(current_setting('app.current_login', true), ''),
          'hr.merit_progression', NULLIF(current_setting('app.request_id', true), ''),
          jsonb_build_object('event', 'avaliacao.progressao.applied', 'progressionId', $1),
          NULL::text, NULL::text, NULL::text
        )
        `,
        [id],
      );
      return {
        id: updated.rows[0]!.id,
        employeeId: updated.rows[0]!.employee_id,
        status: updated.rows[0]!.status,
        appliedAt: updated.rows[0]!.applied_at,
      };
    });
  }
}
