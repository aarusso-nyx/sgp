import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import {
  RegisterReintegrationOrderDto,
  ReintegrationKind,
} from './reintegration-order.dto';
import {
  ReintegrationEligibilityService,
  ReintegrationOrderRow,
} from './reintegration-eligibility.service';
import { ReintegrationFinancialService } from './reintegration-financial.service';

export interface ReintegrationOrderSummary {
  id: string;
  employmentLinkId: string;
  originalTerminationEventId: string;
  reinstatementDate: string;
  kind: ReintegrationKind;
  processNumber: string | null;
  court: string | null;
  decisionDate: string;
  attachmentUri: string | null;
  status: string;
  appliedAt: string | null;
  createdAt: string;
  originalS2299Receipt: string | null;
}

export interface ReintegrationApplyResult extends ReintegrationOrderSummary {
  employeeId: string;
  reprocessedCompetencies: string[];
  totalPayable: string;
}

@Injectable()
export class ReintegrationOrderService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly eligibilityService: ReintegrationEligibilityService = new ReintegrationEligibilityService(),
    @Optional()
    private readonly financialService: ReintegrationFinancialService = new ReintegrationFinancialService(),
  ) {}

  async register(
    employmentLinkId: string,
    input: RegisterReintegrationOrderDto,
  ): Promise<ReintegrationOrderSummary> {
    const tenantId = this.eligibilityService.currentTenantId();
    const reinstatementDate = this.eligibilityService.dateOnly(
      input.reinstatementDate,
    );
    const decisionDate = this.eligibilityService.dateOnly(input.decisionDate);
    const today = this.eligibilityService.dateOnly(new Date());
    if (reinstatementDate > today) {
      throw new BadRequestException({
        code: 'REINTEGRATION_FUTURE_DATE',
        message: 'reinstatementDate cannot be in the future',
      });
    }
    if (input.kind === ReintegrationKind.JUDICIAL && !input.processNumber) {
      throw new BadRequestException({
        code: 'REINTEGRATION_PROCESS_REQUIRED',
        message: 'processNumber is required for judicial reintegration',
      });
    }

    return this.databaseService.transaction(async (client) => {
      const link = await this.eligibilityService.loadLink(
        client,
        tenantId,
        employmentLinkId,
        true,
      );
      if (!link) {
        throw new NotFoundException('Terminated employment link not found');
      }
      const terminationDate = this.eligibilityService.dateOnly(
        link.termination_date,
      );
      if (reinstatementDate < terminationDate) {
        throw new BadRequestException({
          code: 'REINTEGRATION_BEFORE_TERMINATION',
          message:
            'reinstatementDate cannot be before original terminationDate',
        });
      }

      const terminationEvent =
        await this.eligibilityService.resolveTerminationEvent(
          client,
          tenantId,
          employmentLinkId,
          input,
        );

      const rows = await client.query<ReintegrationOrderRow>(
        `
        INSERT INTO hr.reintegration_order (
          tenant_id,
          employment_link_id,
          original_termination_event_id,
          reinstatement_date,
          kind,
          process_number,
          court,
          decision_date,
          attachment_uri,
          status
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::date,
          $5::hr.reintegration_order_kind,
          NULLIF($6, ''),
          NULLIF($7, ''),
          $8::date,
          NULLIF($9, ''),
          'REGISTERED'::hr.reintegration_order_status
        )
        RETURNING
          id::text,
          tenant_id::text,
          employment_link_id::text,
          original_termination_event_id::text,
          reinstatement_date,
          kind::text,
          process_number,
          court,
          decision_date,
          attachment_uri,
          status::text,
          applied_at,
          created_at,
          $10::text AS original_s2299_receipt
        `,
        [
          tenantId,
          employmentLinkId,
          terminationEvent.id,
          reinstatementDate,
          input.kind,
          input.processNumber ?? '',
          input.court ?? '',
          decisionDate,
          input.attachmentUri ?? '',
          terminationEvent.receipt,
        ],
      );
      return this.toSummary(rows.rows[0]!);
    });
  }

  async apply(orderId: string): Promise<ReintegrationApplyResult> {
    const tenantId = this.eligibilityService.currentTenantId();
    return this.databaseService.transaction(async (client) => {
      const order = await this.eligibilityService.loadOrder(
        client,
        tenantId,
        orderId,
      );
      if (!order) throw new NotFoundException('Reintegration order not found');
      const link = await this.eligibilityService.loadLink(
        client,
        tenantId,
        order.employment_link_id,
        false,
      );
      if (!link) {
        throw new NotFoundException('Reintegration employment link not found');
      }

      const reinstatementDate = this.eligibilityService.dateOnly(
        order.reinstatement_date,
      );
      const terminationDate = link.termination_date
        ? this.eligibilityService.dateOnly(link.termination_date)
        : this.eligibilityService.dateOnly(order.reinstatement_date);
      const activeStatusId =
        await this.eligibilityService.resolveActiveStatusId(
          client,
          tenantId,
          link,
        );

      await client.query(
        `
        INSERT INTO hr.employee_status_history (
          tenant_id,
          employee_id,
          functional_status_id,
          starts_on,
          notes,
          cause
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::date,
          'Reintegration order ' || $5::text,
          'REINSTATEMENT'
        )
        `,
        [
          tenantId,
          link.employee_id,
          activeStatusId,
          reinstatementDate,
          order.id,
        ],
      );
      await client.query(
        `
        UPDATE hr.employee
        SET lifecycle_status = 'ACTIVE'::"EmployeeLifecycleStatus",
            terminated_on = NULL,
            termination_reason_id = NULL,
            functional_status_id = $3::uuid,
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND id = $2::uuid
        `,
        [tenantId, link.employee_id, activeStatusId],
      );
      await client.query(
        `
        UPDATE hr.employment_link
        SET end_date = NULL,
            termination_payroll_run_id = NULL,
            functional_status_id = $3::uuid,
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND id = $2::uuid
        `,
        [tenantId, link.employment_link_id, activeStatusId],
      );

      const retro = await this.financialService.reprocessRetroactivePayroll(
        client,
        tenantId,
        link,
        terminationDate,
        this.eligibilityService.dateOnly(order.decision_date),
      );

      const updated = await client.query<ReintegrationOrderRow>(
        `
        UPDATE hr.reintegration_order
        SET status = 'APPLIED'::hr.reintegration_order_status,
            applied_at = COALESCE(applied_at, now())
        WHERE tenant_id = $1::uuid
          AND id = $2::uuid
        RETURNING
          id::text,
          tenant_id::text,
          employment_link_id::text,
          original_termination_event_id::text,
          reinstatement_date,
          kind::text,
          process_number,
          court,
          decision_date,
          attachment_uri,
          status::text,
          applied_at,
          created_at,
          $3::text AS original_s2299_receipt
        `,
        [tenantId, order.id, order.original_s2299_receipt ?? ''],
      );
      await this.appendAudit(
        client,
        'PROCESS',
        'hr.employee',
        link.employee_id,
        {
          reintegrationOrderId: order.id,
          employmentLinkId: link.employment_link_id,
          reprocessedCompetencies: retro.competencies,
        },
      );
      return {
        ...this.toSummary(updated.rows[0]!),
        employeeId: link.employee_id,
        reprocessedCompetencies: retro.competencies,
        totalPayable: retro.totalPayable,
      };
    });
  }

  private async appendAudit(
    client: PoolClient,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        $1,
        $2,
        $3,
        NULL,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        $2,
        NULLIF(current_setting('app.request_id', true), ''),
        $4::jsonb,
        NULL,
        NULL,
        NULL
      )
      `,
      [action, resourceType, resourceId, JSON.stringify(metadata)],
    );
  }

  private toSummary(row: ReintegrationOrderRow): ReintegrationOrderSummary {
    return {
      id: row.id,
      employmentLinkId: row.employment_link_id,
      originalTerminationEventId: row.original_termination_event_id,
      reinstatementDate: this.eligibilityService.dateOnly(
        row.reinstatement_date,
      ),
      kind: row.kind,
      processNumber: row.process_number,
      court: row.court,
      decisionDate: this.eligibilityService.dateOnly(row.decision_date),
      attachmentUri: row.attachment_uri,
      status: row.status,
      appliedAt: row.applied_at ? new Date(row.applied_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      originalS2299Receipt: row.original_s2299_receipt,
    };
  }
}
