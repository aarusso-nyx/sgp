import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { domainError } from '../../../common/errors/domain-error';
import { RequestContextStore } from '../../../common/request-context/request-context.store';
import {
  RegisterReintegrationOrderDto,
  ReintegrationKind,
} from './reintegration-order.dto';

export interface LinkRow extends QueryResultRow {
  employment_link_id: string;
  tenant_id: string;
  employee_id: string;
  employee_registration: string;
  termination_date: Date | string | null;
  branch_id: string | null;
  work_location_id: string | null;
  functional_status_id: string | null;
}

export interface TerminationEventRow extends QueryResultRow {
  id: string;
  receipt: string;
}

export interface ReintegrationOrderRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  employment_link_id: string;
  original_termination_event_id: string;
  reinstatement_date: Date | string;
  kind: ReintegrationKind;
  process_number: string | null;
  court: string | null;
  decision_date: Date | string;
  attachment_uri: string | null;
  status: string;
  applied_at: Date | string | null;
  created_at: Date | string;
  original_s2299_receipt: string | null;
}

export interface IdRow extends QueryResultRow {
  id: string;
}

@Injectable()
export class ReintegrationEligibilityService {
  currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Tenant context is required',
      );
    }
    return tenantId;
  }

  dateOnly(value: Date | string | null): string {
    if (!value) throw new BadRequestException('A required date is missing');
    return new Date(value).toISOString().slice(0, 10);
  }

  async loadLink(
    client: PoolClient,
    tenantId: string,
    employmentLinkId: string,
    requireTerminated: boolean,
  ): Promise<LinkRow | null> {
    const rows = await client.query<LinkRow>(
      `
      SELECT
        link.id::text AS employment_link_id,
        link.tenant_id::text,
        employee.id::text AS employee_id,
        employee.registration AS employee_registration,
        COALESCE(employee.terminated_on, link.end_date) AS termination_date,
        employee.branch_id::text,
        employee.work_location_id::text,
        COALESCE(employee.functional_status_id, link.functional_status_id)::text AS functional_status_id
      FROM hr.employment_link link
      JOIN hr.employee employee
        ON employee.tenant_id = link.tenant_id
       AND employee.employment_link_id = link.id
      WHERE link.tenant_id = $1::uuid
        AND link.id = $2::uuid
        AND ($3::boolean = false OR COALESCE(employee.terminated_on, link.end_date) IS NOT NULL)
      ORDER BY employee.updated_at DESC
      LIMIT 1
      `,
      [tenantId, employmentLinkId, requireTerminated],
    );
    return rows.rows[0] ?? null;
  }

  async resolveTerminationEvent(
    client: PoolClient,
    tenantId: string,
    employmentLinkId: string,
    input: RegisterReintegrationOrderDto,
  ): Promise<TerminationEventRow> {
    if (input.originalTerminationEventId) {
      const rows = await client.query<TerminationEventRow>(
        `
        SELECT
          message_id::text AS id,
          COALESCE(response->'receipt'->>'receiptNumber', source_ref->>'reference', $3)::text AS receipt
        FROM public.esocial_events
        WHERE tenant_id = $1::uuid
          AND message_id = $2::uuid
          AND event_class = 'S-2299'
        `,
        [
          tenantId,
          input.originalTerminationEventId,
          input.originalS2299Receipt ?? '',
        ],
      );
      if (rows.rows[0]) return rows.rows[0];
    }

    const rows = await client.query<TerminationEventRow>(
      `
      SELECT
        message_id::text AS id,
        COALESCE(response->'receipt'->>'receiptNumber', source_ref->>'reference', $3)::text AS receipt
      FROM public.esocial_events
      WHERE tenant_id = $1::uuid
        AND event_class = 'S-2299'
        AND (
          source_ref->>'sourceEntityId' = $2
          OR payload->>'employmentLinkId' = $2
          OR payload->>'employment_link_id' = $2
        )
      ORDER BY tstamp_terminal DESC NULLS LAST, tstamp_created DESC
      LIMIT 1
      `,
      [tenantId, employmentLinkId, input.originalS2299Receipt ?? ''],
    );
    const row = rows.rows[0];
    if (!row) {
      throw new NotFoundException('Original S-2299 event not found');
    }
    return row;
  }

  async loadOrder(
    client: PoolClient,
    tenantId: string,
    orderId: string,
  ): Promise<ReintegrationOrderRow | null> {
    const rows = await client.query<ReintegrationOrderRow>(
      `
      SELECT
        order_row.id::text,
        order_row.tenant_id::text,
        order_row.employment_link_id::text,
        order_row.original_termination_event_id::text,
        order_row.reinstatement_date,
        order_row.kind::text,
        order_row.process_number,
        order_row.court,
        order_row.decision_date,
        order_row.attachment_uri,
        order_row.status::text,
        order_row.applied_at,
        order_row.created_at,
        COALESCE(event.response->'receipt'->>'receiptNumber', event.source_ref->>'reference') AS original_s2299_receipt
      FROM hr.reintegration_order order_row
      JOIN public.esocial_events event
        ON event.tenant_id = order_row.tenant_id
       AND event.message_id = order_row.original_termination_event_id
      WHERE order_row.tenant_id = $1::uuid
        AND order_row.id = $2::uuid
      `,
      [tenantId, orderId],
    );
    return rows.rows[0] ?? null;
  }

  async resolveActiveStatusId(
    client: PoolClient,
    tenantId: string,
    link: LinkRow,
  ): Promise<string> {
    if (link.functional_status_id) return link.functional_status_id;
    const rows = await client.query<IdRow>(
      `
      SELECT id::text
      FROM hr.functional_status
      WHERE tenant_id = $1::uuid
        AND lifecycle_status = 'ACTIVE'::"EmployeeLifecycleStatus"
      ORDER BY enters_payroll DESC, code
      LIMIT 1
      `,
      [tenantId],
    );
    if (!rows.rows[0]) {
      throw new NotFoundException('Active functional status not found');
    }
    return rows.rows[0].id;
  }
}
