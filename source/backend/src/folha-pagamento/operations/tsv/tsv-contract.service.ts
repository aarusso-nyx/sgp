import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../../../common/request-context/request-context.store';
import { DatabaseService } from '../../../database/database.service';
import { UpdateTsvContractDto } from './tsv-contract.dto';

type TsvPatchKey =
  | 'role'
  | 'monthly_amount'
  | 'weekly_hours'
  | 'workplace_id'
  | 'supervisor_employee_id'
  | 'education_institution'
  | 'internship_plan_uri';

interface TsvContractRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  start_date: Date | string;
  role: string;
  monthly_amount: string;
  weekly_hours: string;
  workplace_id: string;
  supervisor_employee_id: string | null;
  education_institution: string | null;
  internship_plan_uri: string | null;
}

export interface TsvContractChangeDto {
  id: string;
  tenantId: string;
  tsvContractId: string;
  effectiveDate: string;
  fieldsChanged: Record<TsvPatchKey, true>;
  previousValues: Partial<Record<TsvPatchKey, unknown>>;
  newValues: Partial<Record<TsvPatchKey, unknown>>;
  reason: string;
}

@Injectable()
export class TsvContractService {
  constructor(private readonly databaseService: DatabaseService) {}

  async update(
    contractId: string,
    patch: UpdateTsvContractDto,
  ): Promise<TsvContractChangeDto> {
    const tenantId = this.currentTenantId();
    const effectiveDate = patch.effectiveDate;
    const reason = patch.reason.trim();
    if (!reason) throw new BadRequestException('Change reason is required');

    return this.databaseService.transaction(async (client) => {
      const contract = await this.loadContract(client, tenantId, contractId);
      if (!contract) throw new NotFoundException('TS-V contract not found');
      if (new Date(effectiveDate) < new Date(contract.start_date)) {
        throw new BadRequestException(
          'TS-V contract change effectiveDate cannot be before startDate',
        );
      }

      const diff = this.diff(contract, patch);
      if (Object.keys(diff.fieldsChanged).length === 0) {
        throw new BadRequestException(
          'TS-V contract change requires at least one real diff',
        );
      }

      const row = await this.insertChange(
        client,
        contract,
        effectiveDate,
        diff,
        reason,
      );
      await this.applyCurrentSnapshot(client, contract.id, diff.newValues);
      return row;
    });
  }

  private async loadContract(
    client: PoolClient,
    tenantId: string,
    contractId: string,
  ): Promise<TsvContractRow | null> {
    const result = await client.query<TsvContractRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        start_date,
        role,
        monthly_amount::text,
        weekly_hours::text,
        workplace_id::text,
        supervisor_employee_id::text,
        education_institution,
        internship_plan_uri
      FROM hr.tsv_contract
      WHERE tenant_id = $1::uuid
        AND id = $2::uuid
      `,
      [tenantId, contractId],
    );
    return result.rows[0] ?? null;
  }

  private diff(
    contract: TsvContractRow,
    patch: UpdateTsvContractDto,
  ): {
    fieldsChanged: Record<TsvPatchKey, true>;
    previousValues: Partial<Record<TsvPatchKey, unknown>>;
    newValues: Partial<Record<TsvPatchKey, unknown>>;
  } {
    const fieldsChanged = {} as Record<TsvPatchKey, true>;
    const previousValues: Partial<Record<TsvPatchKey, unknown>> = {};
    const newValues: Partial<Record<TsvPatchKey, unknown>> = {};

    this.compare(
      fieldsChanged,
      previousValues,
      newValues,
      'role',
      contract.role,
      patch.role,
    );
    this.compare(
      fieldsChanged,
      previousValues,
      newValues,
      'monthly_amount',
      normalizeDecimal(contract.monthly_amount, 2),
      patch.monthlyAmount === undefined
        ? undefined
        : normalizeDecimal(patch.monthlyAmount, 2),
    );
    this.compare(
      fieldsChanged,
      previousValues,
      newValues,
      'weekly_hours',
      normalizeDecimal(contract.weekly_hours, 6),
      patch.weeklyHours === undefined
        ? undefined
        : normalizeDecimal(patch.weeklyHours, 6),
    );
    this.compare(
      fieldsChanged,
      previousValues,
      newValues,
      'workplace_id',
      contract.workplace_id,
      patch.workplaceId,
    );
    this.compare(
      fieldsChanged,
      previousValues,
      newValues,
      'supervisor_employee_id',
      contract.supervisor_employee_id,
      patch.supervisorEmployeeId,
    );
    this.compare(
      fieldsChanged,
      previousValues,
      newValues,
      'education_institution',
      contract.education_institution,
      patch.educationInstitution,
    );
    this.compare(
      fieldsChanged,
      previousValues,
      newValues,
      'internship_plan_uri',
      contract.internship_plan_uri,
      patch.internshipPlanUri,
    );
    return { fieldsChanged, previousValues, newValues };
  }

  private compare(
    fieldsChanged: Record<TsvPatchKey, true>,
    previousValues: Partial<Record<TsvPatchKey, unknown>>,
    newValues: Partial<Record<TsvPatchKey, unknown>>,
    key: TsvPatchKey,
    previous: unknown,
    next: unknown,
  ): void {
    if (next === undefined) return;
    const normalizedPrevious = previous ?? null;
    const normalizedNext = next ?? null;
    if (scalarText(normalizedPrevious, '') === scalarText(normalizedNext, '')) {
      return;
    }
    fieldsChanged[key] = true;
    previousValues[key] = normalizedPrevious;
    newValues[key] = normalizedNext;
  }

  private async insertChange(
    client: PoolClient,
    contract: TsvContractRow,
    effectiveDate: string,
    diff: {
      fieldsChanged: Record<TsvPatchKey, true>;
      previousValues: Partial<Record<TsvPatchKey, unknown>>;
      newValues: Partial<Record<TsvPatchKey, unknown>>;
    },
    reason: string,
  ): Promise<TsvContractChangeDto> {
    const result = await client.query<{
      id: string;
      tenant_id: string;
      tsv_contract_id: string;
      effective_date: Date | string;
      fields_changed: Record<TsvPatchKey, true>;
      previous_values: Partial<Record<TsvPatchKey, unknown>>;
      new_values: Partial<Record<TsvPatchKey, unknown>>;
      reason: string;
    }>(
      `
      INSERT INTO hr.tsv_contract_change (
        tenant_id,
        tsv_contract_id,
        effective_date,
        fields_changed,
        previous_values,
        new_values,
        reason
      )
      VALUES ($1::uuid, $2::uuid, $3::date, $4::jsonb, $5::jsonb, $6::jsonb, $7)
      RETURNING
        id::text,
        tenant_id::text,
        tsv_contract_id::text,
        effective_date,
        fields_changed,
        previous_values,
        new_values,
        reason
      `,
      [
        contract.tenant_id,
        contract.id,
        effectiveDate,
        JSON.stringify(diff.fieldsChanged),
        JSON.stringify(diff.previousValues),
        JSON.stringify(diff.newValues),
        reason,
      ],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      tsvContractId: row.tsv_contract_id,
      effectiveDate: new Date(row.effective_date).toISOString().slice(0, 10),
      fieldsChanged: row.fields_changed,
      previousValues: row.previous_values,
      newValues: row.new_values,
      reason: row.reason,
    };
  }

  private async applyCurrentSnapshot(
    client: PoolClient,
    contractId: string,
    newValues: Partial<Record<TsvPatchKey, unknown>>,
  ): Promise<void> {
    await client.query(
      `
      UPDATE hr.tsv_contract
      SET role = COALESCE($2, role),
          monthly_amount = COALESCE(NULLIF($3, '')::numeric(14,2), monthly_amount),
          weekly_hours = COALESCE(NULLIF($4, '')::numeric(18,6), weekly_hours),
          workplace_id = COALESCE(NULLIF($5, '')::uuid, workplace_id),
          supervisor_employee_id = CASE
            WHEN $6 = '__unchanged__' THEN supervisor_employee_id
            ELSE NULLIF($6, '')::uuid
          END,
          education_institution = CASE
            WHEN $7 = '__unchanged__' THEN education_institution
            ELSE NULLIF($7, '')
          END,
          internship_plan_uri = CASE
            WHEN $8 = '__unchanged__' THEN internship_plan_uri
            ELSE NULLIF($8, '')
          END,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [
        contractId,
        stringOrNull(newValues.role),
        stringOrEmpty(newValues.monthly_amount),
        stringOrEmpty(newValues.weekly_hours),
        stringOrEmpty(newValues.workplace_id),
        markerOrString(newValues, 'supervisor_employee_id'),
        markerOrString(newValues, 'education_institution'),
        markerOrString(newValues, 'internship_plan_uri'),
      ],
    );
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) throw new Error('Tenant context is required');
    return tenantId;
  }
}

function normalizeDecimal(value: unknown, scale: number): string {
  const numeric = Number(scalarText(value, '0').replace(',', '.'));
  if (!Number.isFinite(numeric)) {
    throw new BadRequestException('Invalid decimal value for TS-V contract');
  }
  return numeric.toFixed(scale);
}

function stringOrNull(value: unknown): string | null {
  return value === undefined ? null : scalarText(value, '');
}

function stringOrEmpty(value: unknown): string {
  return value === undefined ? '' : scalarText(value, '');
}

function markerOrString(
  values: Partial<Record<TsvPatchKey, unknown>>,
  key: TsvPatchKey,
): string {
  if (!Object.prototype.hasOwnProperty.call(values, key))
    return '__unchanged__';
  return scalarText(values[key], '');
}

function scalarText(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}
