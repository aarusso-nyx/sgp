import { Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  EmittedESocialEvent,
  ESocialEmitService,
} from '../esocial-emit.service';
import { S2230Builder } from './s2230.builder';
import { S2299Builder } from './s2299.builder';
import { sha256 } from './s22xx-common';

export interface ES03DispatchResult {
  eventKind: 'S-2230' | 'S-2299';
  pendingId: string;
  sourceEntityId: string;
  xmlHash: string;
  emitted: boolean;
  event?: EmittedESocialEvent;
}

interface PendingStatusRow extends QueryResultRow {
  id: string;
  event_kind: 'S-2230' | 'S-2299';
  source_id: string;
  employee_name: string;
  status: string;
  enqueued_at: Date | string;
  receipt: string | null;
  blocked_reason: string | null;
}

@Injectable()
export class ES03Service {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emitService: ESocialEmitService,
    private readonly s2230Builder: S2230Builder,
    private readonly s2299Builder: S2299Builder,
  ) {}

  async listStatus(): Promise<
    Array<{
      id: string;
      eventKind: 'S-2230' | 'S-2299';
      sourceId: string;
      employeeName: string;
      status: string;
      enqueuedAt: string;
      receipt: string | null;
      blockedReason: string | null;
    }>
  > {
    const tenantId = this.currentTenantId();
    const rows = await this.databaseService.query<PendingStatusRow>(
      `
      SELECT
        pending.id::text,
        'S-2230'::text AS event_kind,
        pending.leave_or_vacation_id::text AS source_id,
        employee.name AS employee_name,
        pending.status::text,
        pending.enqueued_at,
        event.reference AS receipt,
        NULL::text AS blocked_reason
      FROM esocial.s2230_pending pending
      LEFT JOIN hr.leave_record leave_record
        ON pending.kind = 'LEAVE'
       AND leave_record.id = pending.leave_or_vacation_id
      LEFT JOIN hr.vacation_record vacation
        ON pending.kind = 'VACATION'
       AND vacation.id = pending.leave_or_vacation_id
      JOIN hr.employee employee
        ON employee.id = COALESCE(leave_record.employee_id, vacation.employee_id)
      LEFT JOIN public.esocial_event event ON event.id = pending.emitted_event_id
      WHERE pending.tenant_id = $1::uuid
      UNION ALL
      SELECT
        pending.id::text,
        'S-2299'::text AS event_kind,
        pending.employment_link_id::text AS source_id,
        employee.name AS employee_name,
        pending.status::text,
        pending.ready_at AS enqueued_at,
        event.reference AS receipt,
        CASE WHEN run.status <> 'GENERATED'::"PayrollRunStatus" THEN 'payroll_run_not_generated' ELSE NULL END
      FROM esocial.s2299_pending pending
      JOIN hr.employee employee ON employee.id = pending.employee_id
      JOIN payroll.payroll_run run ON run.id = pending.calc_run_id
      LEFT JOIN public.esocial_event event ON event.id = pending.emitted_event_id
      WHERE pending.tenant_id = $1::uuid
      ORDER BY enqueued_at DESC
      `,
      [tenantId],
    );
    return rows.map((row) => ({
      id: row.id,
      eventKind: row.event_kind,
      sourceId: row.source_id,
      employeeName: row.employee_name,
      status: row.status,
      enqueuedAt: new Date(row.enqueued_at).toISOString(),
      receipt: row.receipt,
      blockedReason: row.blocked_reason,
    }));
  }

  async emitS2230(pendingId: string): Promise<ES03DispatchResult> {
    const tenantId = this.currentTenantId();
    const record = await this.s2230Builder.buildPending(tenantId, pendingId);
    const xmlHash = sha256(record.xml);
    const event = await this.emitService.emit({
      tenantId,
      eventKind: 'S-2230',
      xml: record.xml,
      reference: record.reference,
      competence: record.competence,
      sourceEntityKind: record.sourceEntityKind,
      sourceEntityId: record.sourceEntityId,
      xmlHash,
      payload: record.payload,
    });
    await this.databaseService.query(
      `
      UPDATE esocial.s2230_pending
      SET status = 'EMITTED',
          emitted_event_id = $3::uuid,
          consumed_at = now()
      WHERE tenant_id = $1::uuid
        AND id = $2::uuid
      `,
      [tenantId, pendingId, event.id],
    );
    return {
      eventKind: 'S-2230',
      pendingId,
      sourceEntityId: record.sourceEntityId,
      xmlHash,
      emitted: true,
      event,
    };
  }

  async emitS2299(pendingId: string): Promise<ES03DispatchResult> {
    const tenantId = this.currentTenantId();
    const record = await this.s2299Builder.buildPending(tenantId, pendingId);
    const xmlHash = sha256(record.xml);
    const event = await this.emitService.emit({
      tenantId,
      eventKind: 'S-2299',
      xml: record.xml,
      reference: record.reference,
      competence: record.competence,
      sourceEntityKind: 'hr.employment_link',
      sourceEntityId: record.employmentLinkId,
      xmlHash,
      payload: record.payload,
    });
    await this.databaseService.query(
      `
      UPDATE esocial.s2299_pending
      SET status = 'EMITTED',
          emitted_event_id = $3::uuid,
          consumed_at = now()
      WHERE tenant_id = $1::uuid
        AND id = $2::uuid
      `,
      [tenantId, pendingId, event.id],
    );
    return {
      eventKind: 'S-2299',
      pendingId,
      sourceEntityId: record.employmentLinkId,
      xmlHash,
      emitted: true,
      event,
    };
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required for ES-03 dispatch');
    }
    return tenantId;
  }
}
