import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';

import { IdRow } from './employees.types';

export interface FunctionalStatusSeed {
  code: string;
  description: string;
  modality: string;
  kind: string;
  entersPayroll: boolean;
  lifecycleStatus: string;
}

@Injectable()
export class EmployeeReferenceDataService {
  async ensureFunctionalStatus(
    client: PoolClient,
    input: FunctionalStatusSeed,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO hr.functional_status (
        tenant_id,
        code,
        description,
        modality,
        kind,
        enters_payroll,
        lifecycle_status,
        status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::"EmployeeLifecycleStatus",
        'ACTIVE'::"RecordStatus"
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        modality = EXCLUDED.modality,
        kind = EXCLUDED.kind,
        enters_payroll = EXCLUDED.enters_payroll,
        lifecycle_status = EXCLUDED.lifecycle_status,
        status = 'ACTIVE'::"RecordStatus",
        updated_at = now()
      RETURNING id::text
      `,
      [
        input.code,
        input.description,
        input.modality,
        input.kind,
        input.entersPayroll,
        input.lifecycleStatus,
      ],
    );
    return rows.rows[0]!.id;
  }

  async ensureEmploymentLink(
    client: PoolClient,
    code: string,
    name: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO hr.employment_link (tenant_id, code, name, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET name = EXCLUDED.name, status = 'ACTIVE'::"RecordStatus", updated_at = now()
      RETURNING id::text
      `,
      [code, name],
    );
    return rows.rows[0]!.id;
  }

  async ensureContractType(
    client: PoolClient,
    code: string,
    name: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO hr.contract_type (tenant_id, code, name, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET name = EXCLUDED.name, status = 'ACTIVE'::"RecordStatus", updated_at = now()
      RETURNING id::text
      `,
      [code, name],
    );
    return rows.rows[0]!.id;
  }

  async ensurePayrollType(client: PoolClient): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
      VALUES (public.sgp_current_tenant_uuid(), 'RESCISAO', 'Rescisao', 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description, status = 'ACTIVE'::"RecordStatus", updated_at = now()
      RETURNING id::text
      `,
    );
    return rows.rows[0]!.id;
  }

  async ensureProcessingType(
    client: PoolClient,
    payrollTypeId: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO payroll.processing_type (
        tenant_id,
        code,
        description,
        payroll_type_id,
        status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        'RESCISAO',
        'Rescisao',
        $1::uuid,
        'ACTIVE'::"RecordStatus"
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        payroll_type_id = EXCLUDED.payroll_type_id,
        status = 'ACTIVE'::"RecordStatus",
        updated_at = now()
      RETURNING id::text
      `,
      [payrollTypeId],
    );
    return rows.rows[0]!.id;
  }
}
