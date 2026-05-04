import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { UpdateAbonoPermanenciaDto } from './employees.dto';
import { toAbonoPermanencia } from './employee-mappers';
import { EmployeeVersionService } from './employee-version.service';
import { AbonoPermanenciaRow } from './employees.types';

@Injectable()
export class EmployeeAbonoPermanenciaService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly versionService: EmployeeVersionService,
  ) {}

  async getAbonoPermanencia(id: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AbonoPermanenciaRow>(
      `
      SELECT
        id::text,
        abono_permanencia_ativo AS active,
        abono_permanencia_inicio AS starts_on,
        abono_permanencia_fundamento AS legal_basis,
        version,
        updated_at
      FROM hr.employee
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
      `,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Employee not found');
    return toAbonoPermanencia(row);
  }

  async updateAbonoPermanencia(
    id: string,
    input: UpdateAbonoPermanenciaDto,
    expectedVersion?: number,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    if (input.active && !input.startsOn) {
      throw new BadRequestException(
        'startsOn is required when abono is active',
      );
    }
    if (input.active && !input.legalBasis?.trim()) {
      throw new BadRequestException(
        'legalBasis is required when abono is active',
      );
    }

    const row = await this.databaseService.transaction(async (client) => {
      if (expectedVersion !== undefined) {
        await this.versionService.assertEmployeeVersion(
          id,
          expectedVersion,
          client,
        );
      }
      const updated = await client.query<AbonoPermanenciaRow>(
        `
        WITH previous AS (
          SELECT
            id,
            abono_permanencia_ativo,
            abono_permanencia_inicio,
            abono_permanencia_fundamento
          FROM hr.employee
          WHERE id = $1::uuid
            AND tenant_id = public.sgp_current_tenant_uuid()
          FOR UPDATE
        ),
        changed AS (
          UPDATE hr.employee employee
          SET
            abono_permanencia_ativo = $2,
            abono_permanencia_inicio = CASE WHEN $2 THEN $3::date ELSE NULL END,
            abono_permanencia_fundamento = NULLIF($4, ''),
            updated_at = now()
          FROM previous
          WHERE employee.id = previous.id
          RETURNING
            employee.id,
            employee.abono_permanencia_ativo,
            employee.abono_permanencia_inicio,
            employee.abono_permanencia_fundamento,
            employee.updated_at,
            employee.version,
            previous.abono_permanencia_ativo AS previous_active,
            previous.abono_permanencia_inicio AS previous_starts_on,
            previous.abono_permanencia_fundamento AS previous_legal_basis
        ),
        audit AS (
          SELECT public.sgp_append_audit_event(
            'UPDATE',
            'hr.employee.abono_permanencia',
            $1::text,
            NULL::uuid,
            NULLIF(current_setting('app.current_user_sub', true), ''),
            NULLIF(current_setting('app.current_login', true), ''),
            'hr.employee',
            NULLIF(current_setting('app.request_id', true), ''),
            jsonb_build_object(
              'event', CASE WHEN $2 THEN 'abono_permanencia.activated' ELSE 'abono_permanencia.deactivated' END,
              'previous', jsonb_build_object(
                'active', changed.previous_active,
                'startsOn', changed.previous_starts_on,
                'legalBasis', changed.previous_legal_basis
              ),
              'current', jsonb_build_object(
                'active', changed.abono_permanencia_ativo,
                'startsOn', changed.abono_permanencia_inicio,
                'legalBasis', changed.abono_permanencia_fundamento
              )
            ),
            NULLIF($4, ''),
            NULL::text,
            NULL::text
          ) AS id
          FROM changed
        )
        SELECT
          changed.id::text,
          changed.abono_permanencia_ativo AS active,
          changed.abono_permanencia_inicio AS starts_on,
          changed.abono_permanencia_fundamento AS legal_basis,
          changed.updated_at,
          changed.version,
          audit.id::text AS audit_event_id
        FROM changed
        CROSS JOIN audit
        `,
        [
          id,
          input.active,
          input.startsOn ?? null,
          input.legalBasis?.trim() ?? '',
        ],
      );
      return updated.rows[0];
    });

    if (!row) throw new NotFoundException('Employee not found');
    AuditMutationContextStore.markMutationAudited();
    return toAbonoPermanencia(row);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for employee operations',
      );
    }
  }
}
