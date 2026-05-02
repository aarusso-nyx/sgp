import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  CreateEnvironmentalExposureDto,
  UpdateEnvironmentalExposureDto,
} from './environmental-exposure.dto';

interface EnvironmentalExposureRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_name: string | null;
  risk_management_program_id: string;
  harmful_agent_code: string;
  agent_kind: string;
  intensity_value: string | null;
  intensity_unit: string;
  exposure_start: Date | string;
  exposure_end: Date | string | null;
  mitigated_by_epi: boolean;
  mitigated_by_epc: boolean;
  special_retirement_eligible: boolean;
  pending_events: string | null;
}

interface PayrollExposureRow extends QueryResultRow {
  environmental_exposure_id: string;
  harmful_agent_code: string;
  agent_kind: string;
  intensity_value: string | null;
  intensity_unit: string;
  mitigated_by_epi: boolean;
  mitigated_by_epc: boolean;
  special_retirement_eligible: boolean;
  insalubrity_due: boolean;
  danger_pay_due: boolean;
}

@Injectable()
export class EnvironmentalExposureService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<ReturnType<typeof this.toSummary>[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EnvironmentalExposureRow>(
      `
      SELECT
        exposure.id::text,
        exposure.employee_id::text,
        employee.name AS employee_name,
        exposure.risk_management_program_id::text,
        exposure.harmful_agent_code,
        exposure.agent_kind::text,
        exposure.intensity_value::text,
        exposure.intensity_unit,
        exposure.exposure_start,
        exposure.exposure_end,
        exposure.mitigated_by_epi,
        exposure.mitigated_by_epc,
        exposure.special_retirement_eligible,
        string_agg(pending.trigger_event::text, ',' ORDER BY pending.trigger_event::text) AS pending_events
      FROM saude.environmental_exposure exposure
      JOIN hr.employee employee ON employee.id = exposure.employee_id
      LEFT JOIN esocial.s2240_pending pending
        ON pending.tenant_id = exposure.tenant_id
       AND pending.environmental_exposure_id = exposure.id
      GROUP BY exposure.id, employee.name
      ORDER BY exposure.exposure_start DESC, employee.name
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(input: CreateEnvironmentalExposureDto) {
    this.ensureDatabase();
    this.assertPeriod(input.exposureStart, input.exposureEnd);
    const rows = await this.databaseService.query<EnvironmentalExposureRow>(
      `
      INSERT INTO saude.environmental_exposure (
        employee_id,
        risk_management_program_id,
        harmful_agent_code,
        agent_kind,
        intensity_value,
        intensity_unit,
        exposure_start,
        exposure_end,
        mitigated_by_epi,
        mitigated_by_epc,
        special_retirement_eligible
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4::saude.harmful_agent_kind,
        $5::numeric,
        COALESCE($6, ''),
        $7::date,
        NULLIF($8, '')::date,
        COALESCE($9, false),
        COALESCE($10, false),
        COALESCE($11, false)
      )
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        risk_management_program_id::text,
        harmful_agent_code,
        agent_kind::text,
        intensity_value::text,
        intensity_unit,
        exposure_start,
        exposure_end,
        mitigated_by_epi,
        mitigated_by_epc,
        special_retirement_eligible,
        'START'::text AS pending_events
      `,
      [
        input.employeeId,
        input.riskManagementProgramId,
        input.harmfulAgentCode,
        input.agentKind,
        input.intensityValue ?? null,
        input.intensityUnit ?? '',
        input.exposureStart,
        input.exposureEnd ?? '',
        input.mitigatedByEpi ?? false,
        input.mitigatedByEpc ?? false,
        input.specialRetirementEligible ?? false,
      ],
    );
    return this.toSummary(rows[0]);
  }

  async update(id: string, input: UpdateEnvironmentalExposureDto) {
    this.ensureDatabase();
    if (input.exposureStart && input.exposureEnd) {
      this.assertPeriod(input.exposureStart, input.exposureEnd);
    }
    const rows = await this.databaseService.query<EnvironmentalExposureRow>(
      `
      UPDATE saude.environmental_exposure
      SET risk_management_program_id = COALESCE($2::uuid, risk_management_program_id),
          harmful_agent_code = COALESCE($3, harmful_agent_code),
          agent_kind = COALESCE($4::saude.harmful_agent_kind, agent_kind),
          intensity_value = COALESCE($5::numeric, intensity_value),
          intensity_unit = COALESCE($6, intensity_unit),
          exposure_start = COALESCE($7::date, exposure_start),
          exposure_end = CASE WHEN $8::text IS NULL THEN exposure_end ELSE NULLIF($8, '')::date END,
          mitigated_by_epi = COALESCE($9, mitigated_by_epi),
          mitigated_by_epc = COALESCE($10, mitigated_by_epc),
          special_retirement_eligible = COALESCE($11, special_retirement_eligible)
      WHERE id = $1::uuid
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        risk_management_program_id::text,
        harmful_agent_code,
        agent_kind::text,
        intensity_value::text,
        intensity_unit,
        exposure_start,
        exposure_end,
        mitigated_by_epi,
        mitigated_by_epc,
        special_retirement_eligible,
        NULL::text AS pending_events
      `,
      [
        id,
        input.riskManagementProgramId ?? null,
        input.harmfulAgentCode ?? null,
        input.agentKind ?? null,
        input.intensityValue ?? null,
        input.intensityUnit ?? null,
        input.exposureStart ?? null,
        Object.prototype.hasOwnProperty.call(input, 'exposureEnd')
          ? (input.exposureEnd ?? '')
          : null,
        input.mitigatedByEpi ?? null,
        input.mitigatedByEpc ?? null,
        input.specialRetirementEligible ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Environmental exposure not found');
    return this.toSummary(row);
  }

  async readForPayroll(employeeId: string, refDate: string) {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PayrollExposureRow>(
      `
      SELECT
        environmental_exposure_id::text,
        harmful_agent_code,
        agent_kind::text,
        intensity_value::text,
        intensity_unit,
        mitigated_by_epi,
        mitigated_by_epc,
        special_retirement_eligible,
        insalubrity_due,
        danger_pay_due
      FROM saude.exposure_read_for_payroll($1::uuid, $2::date)
      ORDER BY harmful_agent_code
      `,
      [employeeId, refDate],
    );
    return rows.map((row) => ({
      environmentalExposureId: row.environmental_exposure_id,
      harmfulAgentCode: row.harmful_agent_code,
      agentKind: row.agent_kind,
      intensityValue: row.intensity_value,
      intensityUnit: row.intensity_unit,
      mitigatedByEpi: row.mitigated_by_epi,
      mitigatedByEpc: row.mitigated_by_epc,
      specialRetirementEligible: row.special_retirement_eligible,
      insalubrityDue: row.insalubrity_due,
      dangerPayDue: row.danger_pay_due,
    }));
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private assertPeriod(start: string, end?: string): void {
    if (end && end < start) {
      throw new BadRequestException(
        'exposureEnd must be on or after exposureStart',
      );
    }
  }

  private toSummary(row: EnvironmentalExposureRow) {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      riskManagementProgramId: row.risk_management_program_id,
      harmfulAgentCode: row.harmful_agent_code,
      agentKind: row.agent_kind,
      intensityValue: row.intensity_value,
      intensityUnit: row.intensity_unit,
      exposureStart: this.dateValue(row.exposure_start),
      exposureEnd: row.exposure_end ? this.dateValue(row.exposure_end) : null,
      mitigatedByEpi: row.mitigated_by_epi,
      mitigatedByEpc: row.mitigated_by_epc,
      specialRetirementEligible: row.special_retirement_eligible,
      pendingEvents: row.pending_events ? row.pending_events.split(',') : [],
    };
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
