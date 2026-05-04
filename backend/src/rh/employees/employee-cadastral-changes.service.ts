import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  ApproveCadastralChangeDto,
  RejectCadastralChangeDto,
} from './employees.dto';
import { stringValue, toCadastralChange } from './employee-mappers';
import { CadastralChangeRow } from './employees.types';

@Injectable()
export class EmployeeCadastralChangesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listCadastralChanges(
    status = 'PENDING',
  ): Promise<Array<Record<string, unknown>>> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CadastralChangeRow>(
      `
      SELECT
        c.id::text,
        c.employee_id::text,
        e.registration,
        e.name AS employee_name,
        c.section,
        c.status,
        c.previous_payload,
        c.requested_payload,
        c.decision_notes,
        c.requested_by_sub,
        c.requested_by_login,
        c.decided_by_sub,
        c.decided_by_login,
        c.requested_at,
        c.decided_at
      FROM hr.cadastral_change_request c
      JOIN hr.employee e ON e.id = c.employee_id
      WHERE c.tenant_id = public.sgp_current_tenant_uuid()
        AND c.status = $1::"CadastralChangeStatus"
      ORDER BY c.requested_at ASC
      `,
      [status.toUpperCase()],
    );
    return rows.map((row) => toCadastralChange(row));
  }

  async approveCadastralChange(
    id: string,
    body: ApproveCadastralChangeDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.databaseService.transaction(async (client) => {
      const existing = await client.query<CadastralChangeRow>(
        `
        SELECT
          c.id::text,
          c.employee_id::text,
          e.registration,
          e.name AS employee_name,
          c.section,
          c.status,
          c.previous_payload,
          c.requested_payload,
          c.decision_notes,
          c.requested_by_sub,
          c.requested_by_login,
          c.decided_by_sub,
          c.decided_by_login,
          c.requested_at,
          c.decided_at
        FROM hr.cadastral_change_request c
        JOIN hr.employee e ON e.id = c.employee_id
        WHERE c.id = $1::uuid
          AND c.tenant_id = public.sgp_current_tenant_uuid()
        FOR UPDATE OF c
        `,
        [id],
      );
      const current = existing.rows[0];
      if (!current) {
        throw new NotFoundException('Cadastral change request not found');
      }
      if (current.status !== 'PENDING') {
        throw new ConflictException('Cadastral change request is not pending');
      }

      await this.applyCadastralPayload(
        client,
        current.employee_id,
        current.section,
        current.requested_payload,
      );

      const approved = await client.query<CadastralChangeRow>(
        `
        UPDATE hr.cadastral_change_request
        SET
          status = 'APPROVED'::"CadastralChangeStatus",
          decision_notes = COALESCE($2, ''),
          decided_by_sub = NULLIF(current_setting('app.current_user_sub', true), ''),
          decided_by_login = NULLIF(current_setting('app.current_login', true), ''),
          decided_at = now(),
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING
          id::text,
          employee_id::text,
          $3::text AS registration,
          $4::text AS employee_name,
          section,
          status::text,
          previous_payload,
          requested_payload,
          decision_notes,
          requested_by_sub,
          requested_by_login,
          decided_by_sub,
          decided_by_login,
          requested_at,
          decided_at
        `,
        [id, body.notes ?? null, current.registration, current.employee_name],
      );

      await client.query(
        `
        SELECT public.sgp_append_audit_event(
          'UPDATE',
          'hr.cadastral_change_request',
          $1::text,
          jsonb_build_object('status', 'PENDING'),
          jsonb_build_object('status', 'APPROVED', 'section', $2::text)
        )
        `,
        [id, current.section],
      );

      return approved.rows;
    });

    return toCadastralChange(rows[0]!);
  }

  async rejectCadastralChange(
    id: string,
    body: RejectCadastralChangeDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CadastralChangeRow>(
      `
      UPDATE hr.cadastral_change_request
      SET
        status = 'REJECTED'::"CadastralChangeStatus",
        decision_notes = $2,
        decided_by_sub = NULLIF(current_setting('app.current_user_sub', true), ''),
        decided_by_login = NULLIF(current_setting('app.current_login', true), ''),
        decided_at = now(),
        updated_at = now()
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
        AND status = 'PENDING'::"CadastralChangeStatus"
      RETURNING
        id::text,
        employee_id::text,
        ''::text AS registration,
        ''::text AS employee_name,
        section,
        status::text,
        previous_payload,
        requested_payload,
        decision_notes,
        requested_by_sub,
        requested_by_login,
        decided_by_sub,
        decided_by_login,
        requested_at,
        decided_at
      `,
      [id, body.reason],
    );
    if (!rows[0]) {
      throw new NotFoundException('Pending cadastral change request not found');
    }
    return toCadastralChange(rows[0]);
  }

  private async applyCadastralPayload(
    client: PoolClient,
    employeeId: string,
    section: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (section === 'endereco') {
      await client.query(
        `
        UPDATE hr.employee
        SET address = $2::jsonb, updated_at = now()
        WHERE id = $1::uuid AND tenant_id = public.sgp_current_tenant_uuid()
        `,
        [employeeId, JSON.stringify(payload)],
      );
      return;
    }

    if (section === 'contato') {
      await client.query(
        `
        UPDATE hr.employee
        SET
          email = COALESCE(NULLIF($2, ''), email),
          phone = COALESCE(NULLIF($3, ''), phone),
          updated_at = now()
        WHERE id = $1::uuid AND tenant_id = public.sgp_current_tenant_uuid()
        `,
        [employeeId, stringValue(payload.email), stringValue(payload.phone)],
      );
      return;
    }

    if (section === 'cadastro') {
      await client.query(
        `
        UPDATE hr.employee
        SET
          social_name = COALESCE(NULLIF($2, ''), social_name),
          rg = COALESCE(NULLIF($3, ''), rg),
          rg_issuer = COALESCE(NULLIF($4, ''), rg_issuer),
          pis_pasep = COALESCE(NULLIF($5, ''), pis_pasep),
          mother_name = COALESCE(NULLIF($6, ''), mother_name),
          father_name = COALESCE(NULLIF($7, ''), father_name),
          updated_at = now()
        WHERE id = $1::uuid AND tenant_id = public.sgp_current_tenant_uuid()
        `,
        [
          employeeId,
          stringValue(payload.socialName),
          stringValue(payload.rg),
          stringValue(payload.rgIssuer),
          stringValue(payload.pisPasep),
          stringValue(payload.motherName),
          stringValue(payload.fatherName),
        ],
      );
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for employee operations',
      );
    }
  }
}
