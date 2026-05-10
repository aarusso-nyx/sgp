import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { SgpEsocialEmittersService } from '../../integrations/stynx-esocial';
import { ChangeContractRegimeDto } from './employees.dto';
import { toIso } from './employee-mappers';
import { EmployeeReferenceDataService } from './employee-reference-data.service';
import { EmployeeVersionService } from './employee-version.service';
import {
  ContractRegimeChangeResult,
  EmployeeRegimeRow,
  RegimeChangeRow,
  VersionedIdRow,
} from './employees.types';

@Injectable()
export class EmployeeContractRegimeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly referenceDataService: EmployeeReferenceDataService,
    private readonly versionService: EmployeeVersionService,
    @Optional()
    private readonly esocialEmitters?: SgpEsocialEmittersService,
  ) {}

  async changeContractRegime(
    employeeId: string,
    input: ChangeContractRegimeDto,
    expectedVersion?: number,
  ): Promise<ContractRegimeChangeResult> {
    this.ensureDatabase();
    this.validateContractRegime(input);

    const result = await this.databaseService.transaction(async (client) => {
      const employeeRows = await client.query<EmployeeRegimeRow>(
        `
        SELECT
          id::text,
          tenant_id::text,
          registration,
          name,
          functional_status_id::text,
          version
        FROM hr.employee
        WHERE id = $1::uuid
          AND tenant_id = public.sgp_current_tenant_uuid()
        FOR UPDATE
        `,
        [employeeId],
      );
      const employee = employeeRows.rows[0];
      if (!employee) throw new NotFoundException('Employee not found');
      if (expectedVersion !== undefined) {
        this.versionService.assertExpectedVersion(
          employee.version,
          expectedVersion,
        );
      }

      const functionalStatusId =
        input.functionalStatusId ??
        employee.functional_status_id ??
        (await this.referenceDataService.ensureFunctionalStatus(client, {
          code: 'EM_EXERCICIO',
          description: 'Em exercicio',
          modality: 'ATIVO',
          kind: 'EXERCICIO',
          entersPayroll: true,
          lifecycleStatus: 'ACTIVE',
        }));
      const contractTypeId = await this.referenceDataService.ensureContractType(
        client,
        this.contractTypeCode(input.contractType),
        this.contractTypeLabel(input.contractType),
      );

      const code = [
        'REGIME',
        employee.registration.replace(/[^A-Za-z0-9]+/g, '-').toUpperCase(),
        input.contractType.toUpperCase(),
        input.effectiveOn.replace(/[^0-9]/g, ''),
      ].join('-');
      const linkRows = await client.query<VersionedIdRow>(
        `
        INSERT INTO hr.employment_link (
          tenant_id,
          code,
          name,
          contract_type,
          end_date,
          commission_position_id,
          regime_law_reference,
          functional_status_id,
          status
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          $3,
          NULLIF($4, '')::date,
          NULLIF($5, '')::uuid,
          NULLIF($6, ''),
          $7::uuid,
          'ACTIVE'::"RecordStatus"
        )
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET
          name = EXCLUDED.name,
          contract_type = EXCLUDED.contract_type,
          end_date = EXCLUDED.end_date,
          commission_position_id = EXCLUDED.commission_position_id,
          regime_law_reference = EXCLUDED.regime_law_reference,
          functional_status_id = EXCLUDED.functional_status_id,
          status = 'ACTIVE'::"RecordStatus",
          updated_at = now()
        RETURNING id::text, version
        `,
        [
          code,
          this.contractTypeLabel(input.contractType),
          input.contractType,
          input.endDate ?? '',
          input.commissionPositionId ?? '',
          input.regimeLawReference?.trim() ?? '',
          functionalStatusId,
        ],
      );
      const employmentLinkId = linkRows.rows[0]!.id;

      const changeRows = await client.query<RegimeChangeRow>(
        `
        WITH closed_contracts AS (
          UPDATE hr.employment_contract
          SET
            ends_on = $2::date,
            status = 'INACTIVE'::"RecordStatus",
            updated_at = now()
          WHERE employee_id = $1::uuid
            AND tenant_id = public.sgp_current_tenant_uuid()
            AND ends_on IS NULL
        ),
        updated_employee AS (
          UPDATE hr.employee
          SET
            employment_link_id = $3::uuid,
            contract_type_id = $4::uuid,
            updated_at = now()
          WHERE id = $1::uuid
            AND tenant_id = public.sgp_current_tenant_uuid()
          RETURNING id, tenant_id, version
        ),
        created_contract AS (
          INSERT INTO hr.employment_contract (
            tenant_id,
            employee_id,
            employment_link_id,
            contract_type_id,
            starts_on,
            ends_on,
            legal_basis,
            status
          )
          SELECT
            tenant_id,
            id,
            $3::uuid,
            $4::uuid,
            $2::date,
            NULLIF($5, '')::date,
            $6,
            'ACTIVE'::"RecordStatus"
          FROM updated_employee
          RETURNING id
        ),
        history AS (
          INSERT INTO hr.employee_status_history (
            tenant_id,
            employee_id,
            functional_status_id,
            starts_on,
            ends_on,
            notes
          )
          SELECT
            tenant_id,
            id,
            $7::uuid,
            $2::date,
            NULLIF($5, '')::date,
            concat('Alteracao de regime juridico: ', $8::text)
          FROM updated_employee
          RETURNING id
        ),
        audit AS (
          SELECT public.sgp_append_audit_event(
            'PROCESS',
            'rh.employment_link',
            $3::text,
            NULL::uuid,
            NULLIF(current_setting('app.current_user_sub', true), ''),
            NULLIF(current_setting('app.current_login', true), ''),
            'hr.employment_link',
            NULLIF(current_setting('app.request_id', true), ''),
            jsonb_build_object(
              'employeeId', $1::text,
              'contractType', $8::text,
              'effectiveOn', $2::text,
              'endDate', NULLIF($5, ''),
              'employmentContractId', (SELECT id::text FROM created_contract),
              'statusHistoryId', (SELECT id::text FROM history)
            ),
            NULLIF($9, ''),
            NULL::text,
            NULL::text
          ) AS id
        )
        SELECT
          $1::text AS employee_id,
          $3::text AS employment_link_id,
          (SELECT id::text FROM created_contract) AS employment_contract_id,
          $8::text AS contract_type,
          $2::date AS effective_on,
          NULLIF($5, '')::date AS end_date,
          (SELECT id::text FROM history) AS status_history_id,
          (SELECT id::text FROM audit) AS audit_event_id,
          (SELECT version FROM updated_employee) AS employee_version,
          $10::integer AS employment_link_version
        `,
        [
          employeeId,
          input.effectiveOn,
          employmentLinkId,
          contractTypeId,
          input.endDate ?? '',
          input.regimeLawReference?.trim() ?? '',
          functionalStatusId,
          input.contractType,
          input.justification?.trim() ?? '',
          linkRows.rows[0]!.version ?? 0,
        ],
      );

      const row = changeRows.rows[0]!;
      AuditMutationContextStore.markMutationAudited();
      return {
        tenantId: employee.tenant_id,
        employeeId: row.employee_id,
        employmentLinkId: row.employment_link_id,
        employmentContractId: row.employment_contract_id,
        contractType: row.contract_type,
        effectiveOn: toIso(row.effective_on),
        endDate: row.end_date ? toIso(row.end_date) : null,
        statusHistoryId: row.status_history_id,
        auditEventId: row.audit_event_id,
        employeeVersion: Number(row.employee_version),
        employmentLinkVersion: Number(row.employment_link_version),
      };
    });
    await this.esocialEmitters?.s2206ContractChange({
      tenantId: result.tenantId,
      sourceId: result.employmentLinkId,
      operation: 'update',
      version: result.employmentLinkVersion,
      data: {
        employeeId: result.employeeId,
        employmentContractId: result.employmentContractId,
        contractType: result.contractType,
        effectiveOn: result.effectiveOn,
        endDate: result.endDate,
      },
    });
    const { tenantId, ...publicResult } = result;
    void tenantId;
    return publicResult;
  }

  private validateContractRegime(input: ChangeContractRegimeDto): void {
    if (input.contractType === 'temporary' && !input.endDate) {
      throw new BadRequestException(
        'Temporary contracts require endDate under Lei 8.745/93',
      );
    }
    if (input.contractType === 'commissioned' && !input.commissionPositionId) {
      throw new BadRequestException(
        'Commissioned contracts require commissionPositionId',
      );
    }
    if (
      input.contractType === 'statutory' &&
      !input.regimeLawReference?.trim()
    ) {
      throw new BadRequestException(
        'Statutory contracts require regimeLawReference',
      );
    }
  }

  private contractTypeCode(
    contractType: ChangeContractRegimeDto['contractType'],
  ): string {
    return {
      statutory: 'ESTATUTARIO',
      celetista: 'CELETISTA',
      commissioned: 'COMISSIONADO',
      temporary: 'TEMPORARIO',
    }[contractType];
  }

  private contractTypeLabel(
    contractType: ChangeContractRegimeDto['contractType'],
  ): string {
    return {
      statutory: 'Estatutario',
      celetista: 'Celetista',
      commissioned: 'Comissionado',
      temporary: 'Temporario Lei 8.745/93',
    }[contractType];
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for employee operations',
      );
    }
  }
}
