import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../../../common/request-context/request-context.store';
import { DatabaseService } from '../../../database/database.service';
import {
  RegisterReintegrationOrderDto,
  ReintegrationKind,
} from './reintegration-order.dto';
import { domainError } from '../../../common/errors/domain-error';

interface LinkRow extends QueryResultRow {
  employment_link_id: string;
  tenant_id: string;
  employee_id: string;
  employee_registration: string;
  termination_date: Date | string | null;
  branch_id: string | null;
  work_location_id: string | null;
  functional_status_id: string | null;
}

interface TerminationEventRow extends QueryResultRow {
  id: string;
  receipt: string;
}

interface ReintegrationOrderRow extends QueryResultRow {
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

interface IdRow extends QueryResultRow {
  id: string;
}

interface PayrollTypeRow extends QueryResultRow {
  payroll_type_id: string;
  processing_type_id: string;
}

interface EarningRow extends QueryResultRow {
  id: string;
}

interface AmountRow extends QueryResultRow {
  amount: string;
}

interface TotalRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

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
  constructor(private readonly databaseService: DatabaseService) {}

  async register(
    employmentLinkId: string,
    input: RegisterReintegrationOrderDto,
  ): Promise<ReintegrationOrderSummary> {
    const tenantId = this.currentTenantId();
    const reinstatementDate = this.dateOnly(input.reinstatementDate);
    const decisionDate = this.dateOnly(input.decisionDate);
    const today = this.dateOnly(new Date());
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
      const link = await this.loadLink(
        client,
        tenantId,
        employmentLinkId,
        true,
      );
      if (!link)
        throw new NotFoundException('Terminated employment link not found');
      const terminationDate = this.dateOnly(link.termination_date);
      if (reinstatementDate < terminationDate) {
        throw new BadRequestException({
          code: 'REINTEGRATION_BEFORE_TERMINATION',
          message:
            'reinstatementDate cannot be before original terminationDate',
        });
      }

      const terminationEvent = await this.resolveTerminationEvent(
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
    const tenantId = this.currentTenantId();
    return this.databaseService.transaction(async (client) => {
      const order = await this.loadOrder(client, tenantId, orderId);
      if (!order) throw new NotFoundException('Reintegration order not found');
      const link = await this.loadLink(
        client,
        tenantId,
        order.employment_link_id,
        false,
      );
      if (!link)
        throw new NotFoundException('Reintegration employment link not found');

      const reinstatementDate = this.dateOnly(order.reinstatement_date);
      const terminationDate = link.termination_date
        ? this.dateOnly(link.termination_date)
        : this.dateOnly(order.reinstatement_date);
      const activeStatusId = await this.resolveActiveStatusId(
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

      const retro = await this.reprocessRetroactivePayroll(
        client,
        tenantId,
        link,
        terminationDate,
        this.dateOnly(order.decision_date),
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

  private async loadLink(
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

  private async resolveTerminationEvent(
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

  private async loadOrder(
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

  private async resolveActiveStatusId(
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

  private async reprocessRetroactivePayroll(
    client: PoolClient,
    tenantId: string,
    link: LinkRow,
    terminationDate: string,
    decisionDate: string,
  ): Promise<{ competencies: string[]; totalPayable: string }> {
    const payrollTypes = await this.ensureRetroPayrollTypes(
      client,
      tenantId,
      link,
    );
    const earnings = await client.query<EarningRow>(
      `
      SELECT id::text
      FROM payroll.payroll_earning_deduction
      WHERE tenant_id = $1::uuid
        AND active = true
        AND kind = 'EARNING'::"PayrollEntryKind"
        AND formula_ready = true
      ORDER BY code
      `,
      [tenantId],
    );
    if (earnings.rows.length === 0) {
      throw new NotFoundException(
        'No compiled payroll earnings available for reintegration',
      );
    }

    const competencies = competenceRange(terminationDate, decisionDate);
    let totalPayableCents = 0n;
    for (const competence of competencies) {
      const [yearText, monthText] = competence.split('-');
      const year = Number(yearText);
      const month = Number(monthText);
      const runId = await this.ensureRetroRun(
        client,
        tenantId,
        link,
        payrollTypes,
        year,
        month,
      );
      for (const earning of earnings.rows) {
        const amountRows = await client.query<AmountRow>(
          `
          SELECT payroll_calc.evaluate_earning_deduction(
            $1::uuid,
            $2::uuid,
            $3::int,
            $4::int
          )::numeric(14,2)::text AS amount
          `,
          [earning.id, link.employee_id, month, year],
        );
        const amount = amountRows.rows[0]?.amount ?? '0.00';
        totalPayableCents += cents(amount);
        await client.query(
          `
          INSERT INTO payroll.employee_payroll_item (
            tenant_id,
            employee_id,
            payroll_run_id,
            earning_deduction_id,
            source,
            competence_year,
            competence_month,
            quantity,
            reference_value,
            amount,
            notes
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::uuid,
            'CALCULATED'::"PayrollEntrySource",
            $5,
            $6,
            1.0000,
            $7::numeric(14,2),
            $7::numeric(14,2),
            'REINSTATEMENT_RETRO'
          )
          ON CONFLICT (idempotency_key)
          WHERE deleted_at IS NULL
            AND idempotency_key IS NOT NULL
          DO UPDATE
          SET amount = EXCLUDED.amount,
              reference_value = EXCLUDED.reference_value,
              notes = EXCLUDED.notes,
              updated_at = now()
          `,
          [tenantId, link.employee_id, runId, earning.id, year, month, amount],
        );
      }
      await this.refreshRunTotals(client, tenantId, runId, link, competence);
    }
    return {
      competencies,
      totalPayable: formatCents(totalPayableCents),
    };
  }

  private async ensureRetroPayrollTypes(
    client: PoolClient,
    tenantId: string,
    link: LinkRow,
  ): Promise<PayrollTypeRow> {
    const payrollType = await client.query<IdRow>(
      `
      INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
      VALUES ($1::uuid, 'REINSTATEMENT_RETRO', 'Reintegration retroactive payroll', 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description,
          status = EXCLUDED.status,
          updated_at = now()
      RETURNING id::text
      `,
      [tenantId],
    );
    const processingType = await client.query<IdRow>(
      `
      INSERT INTO payroll.processing_type (
        tenant_id,
        code,
        description,
        payroll_type_id,
        employment_link_id,
        status
      )
      VALUES (
        $1::uuid,
        'REINSTATEMENT_RETRO',
        'Reintegration retroactive reprocessing',
        $2::uuid,
        $3::uuid,
        'ACTIVE'::"RecordStatus"
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description,
          payroll_type_id = EXCLUDED.payroll_type_id,
          employment_link_id = EXCLUDED.employment_link_id,
          status = EXCLUDED.status,
          updated_at = now()
      RETURNING id::text
      `,
      [tenantId, payrollType.rows[0]!.id, link.employment_link_id],
    );
    return {
      payroll_type_id: payrollType.rows[0]!.id,
      processing_type_id: processingType.rows[0]!.id,
    };
  }

  private async ensureRetroRun(
    client: PoolClient,
    tenantId: string,
    link: LinkRow,
    payrollTypes: PayrollTypeRow,
    year: number,
    month: number,
  ): Promise<string> {
    const existing = await client.query<IdRow>(
      `
      SELECT id::text
      FROM payroll.payroll_run
      WHERE tenant_id = $1::uuid
        AND competence_year = $2
        AND competence_month = $3
        AND branch_id IS NOT DISTINCT FROM NULLIF($4, '')::uuid
        AND payroll_type_id = $5::uuid
        AND processing_type_id = $6::uuid
      LIMIT 1
      `,
      [
        tenantId,
        year,
        month,
        link.branch_id ?? '',
        payrollTypes.payroll_type_id,
        payrollTypes.processing_type_id,
      ],
    );
    if (existing.rows[0]) {
      await client.query(
        `
        UPDATE payroll.payroll_run
        SET status = 'PROCESSING'::"PayrollRunStatus",
            cause = 'REINSTATEMENT_RETRO',
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND id = $2::uuid
        `,
        [tenantId, existing.rows[0].id],
      );
      return existing.rows[0].id;
    }

    const inserted = await client.query<IdRow>(
      `
      INSERT INTO payroll.payroll_run (
        tenant_id,
        competence_year,
        competence_month,
        branch_id,
        payroll_type_id,
        processing_type_id,
        status,
        cause
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        NULLIF($4, '')::uuid,
        $5::uuid,
        $6::uuid,
        'PROCESSING'::"PayrollRunStatus",
        'REINSTATEMENT_RETRO'
      )
      RETURNING id::text
      `,
      [
        tenantId,
        year,
        month,
        link.branch_id ?? '',
        payrollTypes.payroll_type_id,
        payrollTypes.processing_type_id,
      ],
    );
    return inserted.rows[0]!.id;
  }

  private async refreshRunTotals(
    client: PoolClient,
    tenantId: string,
    runId: string,
    link: LinkRow,
    competence: string,
  ): Promise<void> {
    const totals = await client.query<TotalRow>(
      `
      SELECT
        count(DISTINCT item.employee_id)::text AS employee_count,
        coalesce(sum(CASE WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16,2)::text AS total_earnings,
        coalesce(sum(CASE WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16,2)::text AS total_deductions,
        coalesce(sum(CASE
          WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::numeric(16,2)::text AS total_net
      FROM payroll.v_payroll_run_line_active item
      JOIN payroll.payroll_earning_deduction earning ON earning.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      `,
      [runId],
    );
    const total = totals.rows[0]!;
    await client.query(
      `
      UPDATE payroll.payroll_run
      SET status = 'GENERATED'::"PayrollRunStatus",
          employee_count = $2::int,
          total_earnings = $3::numeric(16,2),
          total_deductions = $4::numeric(16,2),
          total_net = $5::numeric(16,2),
          cause = 'REINSTATEMENT_RETRO',
          updated_at = now()
      WHERE tenant_id = $1::uuid
        AND id = $6::uuid
      `,
      [
        tenantId,
        total.employee_count,
        total.total_earnings,
        total.total_deductions,
        total.total_net,
        runId,
      ],
    );
    const [yearText, monthText] = competence.split('-');
    await client.query(
      'SELECT payroll.sgp_create_payroll_financial_record_partition(make_date($1::integer, $2::integer, 1))',
      [Number(yearText), Number(monthText)],
    );
    await client.query(
      `
      INSERT INTO payroll.payroll_financial_record (
        tenant_id,
        employee_id,
        payroll_run_id,
        branch_id,
        work_location_id,
        functional_status_id,
        competence_year,
        competence_month,
        competence,
        total_earnings,
        total_deductions,
        net_amount,
        metadata
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        NULLIF($4, '')::uuid,
        NULLIF($5, '')::uuid,
        NULLIF($6, '')::uuid,
        $7,
        $8,
        make_date($7::integer, $8::integer, 1),
        $9::numeric(16,2),
        $10::numeric(16,2),
        $11::numeric(16,2),
        $12::jsonb
      )
      ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id, competence)
      DO UPDATE
      SET total_earnings = EXCLUDED.total_earnings,
          total_deductions = EXCLUDED.total_deductions,
          net_amount = EXCLUDED.net_amount,
          metadata = EXCLUDED.metadata,
          generated_at = now()
      `,
      [
        tenantId,
        link.employee_id,
        runId,
        link.branch_id ?? '',
        link.work_location_id ?? '',
        link.functional_status_id ?? '',
        Number(yearText),
        Number(monthText),
        total.total_earnings,
        total.total_deductions,
        total.total_net,
        JSON.stringify({ cause: 'REINSTATEMENT_RETRO' }),
      ],
    );
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
        $1::uuid,
        $2::uuid,
        'GENERATED'::"PayrollRunStatus",
        'Reintegration retroactive payroll reprocessed',
        $3::jsonb
      )
      `,
      [
        tenantId,
        runId,
        JSON.stringify({ cause: 'REINSTATEMENT_RETRO', competence }),
      ],
    );
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

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId)
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Tenant context is required',
      );
    return tenantId;
  }

  private toSummary(row: ReintegrationOrderRow): ReintegrationOrderSummary {
    return {
      id: row.id,
      employmentLinkId: row.employment_link_id,
      originalTerminationEventId: row.original_termination_event_id,
      reinstatementDate: this.dateOnly(row.reinstatement_date),
      kind: row.kind,
      processNumber: row.process_number,
      court: row.court,
      decisionDate: this.dateOnly(row.decision_date),
      attachmentUri: row.attachment_uri,
      status: row.status,
      appliedAt: row.applied_at ? new Date(row.applied_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      originalS2299Receipt: row.original_s2299_receipt,
    };
  }

  private dateOnly(value: Date | string | null): string {
    if (!value) throw new BadRequestException('A required date is missing');
    return new Date(value).toISOString().slice(0, 10);
  }
}

function competenceRange(
  terminationDate: string,
  decisionDate: string,
): string[] {
  const start = new Date(`${terminationDate.slice(0, 7)}-01T00:00:00.000Z`);
  const endSeed = new Date(`${decisionDate.slice(0, 7)}-01T00:00:00.000Z`);
  endSeed.setUTCMonth(endSeed.getUTCMonth() - 1);
  const end = endSeed < start ? start : endSeed;
  const result: string[] = [];
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  ) {
    result.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }
  return result;
}

function cents(value: string): bigint {
  const [whole = '', fraction = ''] = value.split('.');
  const sign = whole.startsWith('-') ? -1n : 1n;
  const normalizedWhole = whole.replace('-', '') || '0';
  const normalizedFraction = fraction.padEnd(2, '0').slice(0, 2);
  return sign * (BigInt(normalizedWhole) * 100n + BigInt(normalizedFraction));
}

function formatCents(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
