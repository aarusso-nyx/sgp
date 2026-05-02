import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { EpiSignatureMethod, RegisterEpiDeliveryDto } from './epi.dto';

interface EpiDeliveryRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_name: string | null;
  epi_inventory_id: string;
  ca_number: string | null;
  epi_name: string | null;
  delivered_at: Date | string;
  quantity: number;
  signature_method: string;
  signature_evidence_uri: string | null;
  training_done_at: Date | string | null;
}

@Injectable()
export class EpiDeliveryService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EpiDeliveryRow>(
      `
      SELECT
        delivery.id::text,
        delivery.employee_id::text,
        employee.name AS employee_name,
        delivery.epi_inventory_id::text,
        inventory.ca_number,
        inventory.name AS epi_name,
        delivery.delivered_at,
        delivery.quantity,
        delivery.signature_method::text,
        delivery.signature_evidence_uri,
        delivery.training_done_at
      FROM saude.epi_delivery delivery
      JOIN hr.employee employee ON employee.id = delivery.employee_id
      JOIN saude.epi_inventory inventory ON inventory.id = delivery.epi_inventory_id
      ORDER BY delivery.delivered_at DESC
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async register(input: RegisterEpiDeliveryDto) {
    this.ensureDatabase();
    this.assertSignature(input);
    const rows = await this.databaseService.query<EpiDeliveryRow>(
      `
      INSERT INTO saude.epi_delivery (
        employee_id,
        epi_inventory_id,
        delivered_at,
        quantity,
        signature_method,
        signature_evidence_uri,
        training_done_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::timestamptz,
        $4,
        $5::saude.epi_signature_method,
        NULLIF($6, ''),
        NULLIF($7, '')::date
      )
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        epi_inventory_id::text,
        NULL::text AS ca_number,
        NULL::text AS epi_name,
        delivered_at,
        quantity,
        signature_method::text,
        signature_evidence_uri,
        training_done_at
      `,
      [
        input.employeeId,
        input.epiInventoryId,
        input.deliveredAt,
        input.quantity,
        input.signatureMethod,
        input.signatureEvidenceUri?.trim() ?? '',
        input.trainingDoneAt ?? '',
      ],
    );
    return this.toSummary(rows[0]);
  }

  private assertSignature(input: RegisterEpiDeliveryDto): void {
    if (!input.signatureMethod) {
      throw new BadRequestException('EPI delivery requires signatureMethod');
    }
    if (
      (input.signatureMethod === EpiSignatureMethod.DIGITAL ||
        input.signatureMethod === EpiSignatureMethod.GOVBR) &&
      !input.signatureEvidenceUri?.trim()
    ) {
      throw new BadRequestException(
        'Digital and GovBR EPI delivery require signatureEvidenceUri',
      );
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: EpiDeliveryRow) {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      epiInventoryId: row.epi_inventory_id,
      caNumber: row.ca_number,
      epiName: row.epi_name,
      deliveredAt: new Date(row.delivered_at).toISOString(),
      quantity: Number(row.quantity),
      signatureMethod: row.signature_method,
      signatureEvidenceUri: row.signature_evidence_uri,
      trainingDoneAt: row.training_done_at
        ? this.dateValue(row.training_done_at)
        : null,
    };
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
