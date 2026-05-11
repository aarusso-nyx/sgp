import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';

import { TerminationContextRow } from './rescisao.types';

@Injectable()
export class RescisaoTerminationService {
  async loadContext(
    client: PoolClient,
    employmentLinkId: string,
  ): Promise<TerminationContextRow | null> {
    const result = await client.query<TerminationContextRow>(
      `
      SELECT
        employee.id::text AS employee_id,
        employee.employment_link_id::text,
        employment_link.contract_type::text,
        employee.branch_id::text AS branch_id,
        employee.functional_status_id::text AS functional_status_id,
        employee.work_location_id::text AS work_location_id
      FROM hr.employee employee
      JOIN hr.employment_link employment_link
        ON employment_link.id = employee.employment_link_id
       AND employment_link.tenant_id = employee.tenant_id
      WHERE employee.tenant_id = public.sgp_current_tenant_uuid()
        AND employee.employment_link_id = $1::uuid
      ORDER BY employee.updated_at DESC
      LIMIT 1
      `,
      [employmentLinkId],
    );
    return result.rows[0] ?? null;
  }

  async linkTermination(
    client: PoolClient,
    context: TerminationContextRow,
    payrollRunId: string,
    terminationDate: string,
  ): Promise<void> {
    await client.query(
      `
      UPDATE hr.employment_link
      SET end_date = $2::date,
          termination_payroll_run_id = $3::uuid,
          status = 'INACTIVE'::"RecordStatus",
          updated_at = now()
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
      `,
      [context.employment_link_id, terminationDate, payrollRunId],
    );

    await client.query(
      `
      UPDATE hr.employment_contract
      SET ends_on = $2::date,
          status = 'INACTIVE'::"RecordStatus",
          updated_at = now()
      WHERE employment_link_id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
        AND (ends_on IS NULL OR ends_on > $2::date)
      `,
      [context.employment_link_id, terminationDate],
    );

    await client.query(
      `
      UPDATE hr.employee
      SET terminated_on = COALESCE(terminated_on, $2::date),
          lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus",
          updated_at = now()
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
      `,
      [context.employee_id, terminationDate],
    );
  }

  async appendHistory(
    client: PoolClient,
    payrollRunId: string,
    recalculated: boolean,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO payroll.payroll_run_status_history (
        tenant_id,
        payroll_run_id,
        status,
        note,
        metadata
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        'GENERATED'::"PayrollRunStatus",
        $2,
        $3::jsonb
      )
      `,
      [
        payrollRunId,
        recalculated
          ? 'Termination payroll recalculated'
          : 'Termination payroll calculated',
        JSON.stringify({
          event: recalculated
            ? 'termination.recalculated'
            : 'termination.calculated',
          ...metadata,
        }),
      ],
    );
  }

  async appendAuditEvent(
    client: PoolClient,
    payrollRunId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        'PROCESS',
        'payroll.termination',
        $1::text,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'payroll.payroll_run',
        NULLIF(current_setting('app.request_id', true), ''),
        $2::jsonb,
        'calc12.termination.generated',
        NULL::text,
        NULL::text
      )
      `,
      [payrollRunId, JSON.stringify(metadata)],
    );
  }
}
