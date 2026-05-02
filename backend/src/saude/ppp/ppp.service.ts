import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { GeneratePppDto } from './ppp.dto';

interface PppRecordRow extends QueryResultRow {
  id: string;
  employee_id: string;
  period_start: Date | string;
  period_end: Date | string;
  snapshot_json: Record<string, unknown>;
  generated_at: Date | string;
}

@Injectable()
export class PppService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PppRecordRow>(
      `
      SELECT id::text, employee_id::text, period_start, period_end, snapshot_json, generated_at
      FROM saude.ppp_record
      ORDER BY generated_at DESC
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async generate(input: GeneratePppDto) {
    this.ensureDatabase();
    if (input.periodEnd < input.periodStart) {
      throw new BadRequestException(
        'periodEnd must be on or after periodStart',
      );
    }

    const rows = await this.databaseService.query<PppRecordRow>(
      `
      WITH exposure_rows AS (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', exposure.id::text,
            'harmfulAgentCode', exposure.harmful_agent_code,
            'agentKind', exposure.agent_kind::text,
            'intensityValue', exposure.intensity_value::text,
            'intensityUnit', exposure.intensity_unit,
            'exposureStart', exposure.exposure_start,
            'exposureEnd', exposure.exposure_end,
            'mitigatedByEpi', exposure.mitigated_by_epi,
            'mitigatedByEpc', exposure.mitigated_by_epc,
            'specialRetirementEligible', exposure.special_retirement_eligible
          )
          ORDER BY exposure.exposure_start, exposure.harmful_agent_code
        ) AS rows
        FROM saude.environmental_exposure exposure
        WHERE exposure.employee_id = $1::uuid
          AND exposure.exposure_start <= $3::date
          AND (exposure.exposure_end IS NULL OR exposure.exposure_end >= $2::date)
      ),
      epi_rows AS (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', delivery.id::text,
            'epiInventoryId', delivery.epi_inventory_id::text,
            'caNumber', inventory.ca_number,
            'name', inventory.name,
            'deliveredAt', delivery.delivered_at,
            'quantity', delivery.quantity,
            'signatureMethod', delivery.signature_method::text,
            'signatureEvidenceUri', delivery.signature_evidence_uri,
            'trainingDoneAt', delivery.training_done_at
          )
          ORDER BY delivery.delivered_at
        ) AS rows
        FROM saude.epi_delivery delivery
        JOIN saude.epi_inventory inventory ON inventory.id = delivery.epi_inventory_id
        WHERE delivery.employee_id = $1::uuid
          AND delivery.delivered_at::date <= $3::date
      )
      INSERT INTO saude.ppp_record (
        employee_id,
        period_start,
        period_end,
        snapshot_json
      )
      SELECT
        $1::uuid,
        $2::date,
        $3::date,
        jsonb_build_object(
          'employeeId', $1::text,
          'periodStart', $2::date,
          'periodEnd', $3::date,
          'environmentalExposures', COALESCE((SELECT rows FROM exposure_rows), '[]'::jsonb),
          'epiDeliveries', COALESCE((SELECT rows FROM epi_rows), '[]'::jsonb),
          'generatedAt', now()
        )
      RETURNING id::text, employee_id::text, period_start, period_end, snapshot_json, generated_at
      `,
      [input.employeeId, input.periodStart, input.periodEnd],
    );

    return this.toSummary(rows[0]);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: PppRecordRow) {
    return {
      id: row.id,
      employeeId: row.employee_id,
      periodStart: this.dateValue(row.period_start),
      periodEnd: this.dateValue(row.period_end),
      snapshotJson: row.snapshot_json,
      generatedAt: new Date(row.generated_at).toISOString(),
    };
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
