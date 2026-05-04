import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { EmployeeMutationDto } from './employees.dto';
import { toIso, toSummary } from './employee-mappers';
import { EmployeeVersionService } from './employee-version.service';
import {
  ContractRow,
  CountRow,
  EmployeeDossier,
  EmployeeListRow,
  EmployeeSummary,
  StatusHistoryRow,
} from './employees.types';

@Injectable()
export class EmployeeRegistryService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly versionService: EmployeeVersionService,
  ) {}

  async list(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<EmployeeSummary>> {
    this.ensureDatabase();

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.employee e
      LEFT JOIN hr.functional_status fs ON fs.id = e.functional_status_id
      LEFT JOIN hr.branch b ON b.id = e.branch_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              e.registration,
              e.name,
              coalesce(e.cpf, ''),
              coalesce(e.email, ''),
              coalesce(fs.description, ''),
              coalesce(b.name, '')
            )) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<EmployeeListRow>(
      `
      SELECT
        e.id,
        e.registration,
        e.name,
        e.cpf,
        e.email,
        e.lifecycle_status::text AS lifecycle_status,
        fs.description AS functional_status,
        b.name AS branch_name,
        (e.lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus") AS active,
        e.created_at,
        e.updated_at,
        e.abono_permanencia_ativo,
        e.abono_permanencia_inicio,
        e.abono_permanencia_fundamento,
        e.version,
        CASE
          WHEN concurso.code IS NOT NULL THEN 'concurso ' || concurso.code
          WHEN e.recruitment_concurso_id IS NOT NULL THEN 'concurso ' || e.recruitment_concurso_id::text
          ELSE NULL
        END AS recruitment_origin
      FROM hr.employee e
      LEFT JOIN hr.functional_status fs ON fs.id = e.functional_status_id
      LEFT JOIN hr.branch b ON b.id = e.branch_id
      LEFT JOIN recrutamento.concurso concurso
        ON concurso.tenant_id = e.tenant_id
       AND concurso.id = e.recruitment_concurso_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              e.registration,
              e.name,
              coalesce(e.cpf, ''),
              coalesce(e.email, ''),
              coalesce(fs.description, ''),
              coalesce(b.name, '')
            )) LIKE $1
      ORDER BY e.registration ASC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => toSummary(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async create(input: EmployeeMutationDto): Promise<EmployeeSummary> {
    this.ensureDatabase();
    try {
      const rows = await this.databaseService.query<EmployeeListRow>(
        `
        INSERT INTO hr.employee (
          registration,
          name,
          cpf,
          email,
          lifecycle_status
        )
        VALUES ($1, $2, $3, $4, $5::"EmployeeLifecycleStatus")
        RETURNING
          id,
          registration,
          name,
          cpf,
          email,
          lifecycle_status::text AS lifecycle_status,
          NULL::text AS functional_status,
          NULL::text AS branch_name,
          (lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus") AS active,
          created_at,
          updated_at
        `,
        [
          input.registration.trim(),
          input.name.trim(),
          input.cpf?.trim() || null,
          input.email?.trim().toLowerCase() || null,
          input.active === false ? 'TERMINATED' : 'ACTIVE',
        ],
      );
      return toSummary(rows[0]!);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        throw new ConflictException(
          'An employee with this registration or CPF already exists',
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: EmployeeMutationDto,
    expectedVersion?: number,
  ): Promise<EmployeeSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EmployeeListRow>(
      `
      UPDATE hr.employee
      SET
        registration = $2,
        name = $3,
        cpf = $4,
        email = $5,
        lifecycle_status = $6::"EmployeeLifecycleStatus",
        updated_at = now()
      WHERE id = $1::uuid
        AND ($7::integer IS NULL OR version = $7::integer)
      RETURNING
        id,
        registration,
        name,
        cpf,
        email,
        lifecycle_status::text AS lifecycle_status,
        NULL::text AS functional_status,
        NULL::text AS branch_name,
        (lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus") AS active,
        created_at,
        updated_at,
        version
      `,
      [
        id,
        input.registration.trim(),
        input.name.trim(),
        input.cpf?.trim() || null,
        input.email?.trim().toLowerCase() || null,
        input.active === false ? 'TERMINATED' : 'ACTIVE',
        expectedVersion ?? null,
      ],
    );

    const row = rows[0];
    if (!row && expectedVersion !== undefined) {
      await this.versionService.assertEmployeeVersion(id, expectedVersion);
    }
    if (!row) throw new NotFoundException('Employee not found');
    return toSummary(row);
  }

  async getDossier(id: string): Promise<EmployeeDossier> {
    this.ensureDatabase();
    const [employees, statusHistory, contracts] =
      await this.databaseService.transaction(async (client) => {
        const employeeRows = await client.query<EmployeeListRow>(
          `
          SELECT
            e.id,
            e.registration,
            e.name,
            e.cpf,
            e.email,
            e.lifecycle_status::text AS lifecycle_status,
            fs.description AS functional_status,
            b.name AS branch_name,
            (e.lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus") AS active,
            e.created_at,
            e.updated_at,
            e.version
          FROM hr.employee e
          LEFT JOIN hr.functional_status fs ON fs.id = e.functional_status_id
          LEFT JOIN hr.branch b ON b.id = e.branch_id
          WHERE e.id = $1::uuid
          `,
          [id],
        );
        const historyRows = await client.query<StatusHistoryRow>(
          `
          SELECT
            h.id::text,
            fs.description AS functional_status,
            h.starts_on,
            h.ends_on,
            h.notes
          FROM hr.employee_status_history h
          JOIN hr.functional_status fs ON fs.id = h.functional_status_id
          WHERE h.employee_id = $1::uuid
          ORDER BY h.starts_on DESC, h.created_at DESC
          `,
          [id],
        );
        const contractRows = await client.query<ContractRow>(
          `
          SELECT id::text, starts_on, ends_on, status::text
          FROM hr.employment_contract
          WHERE employee_id = $1::uuid
          ORDER BY starts_on DESC, created_at DESC
          `,
          [id],
        );
        return [
          employeeRows.rows,
          historyRows.rows,
          contractRows.rows,
        ] as const;
      });
    const employee = employees[0];
    if (!employee) throw new NotFoundException('Employee not found');
    return {
      funcionarioId: id,
      tipo: 'dossie',
      emitidoEm: new Date().toISOString(),
      status: 'AVAILABLE',
      employee: toSummary(employee),
      statusHistory: statusHistory.map((row) => ({
        id: row.id,
        functionalStatus: row.functional_status,
        startsOn: toIso(row.starts_on),
        endsOn: row.ends_on ? toIso(row.ends_on) : null,
        notes: row.notes,
      })),
      contracts: contracts.map((row) => ({
        id: row.id,
        startsOn: toIso(row.starts_on),
        endsOn: row.ends_on ? toIso(row.ends_on) : null,
        status: row.status,
      })),
    };
  }

  async deactivate(id: string): Promise<EmployeeSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EmployeeListRow>(
      `
      UPDATE hr.employee
      SET lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus",
          terminated_on = CURRENT_DATE,
          updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        registration,
        name,
        cpf,
        email,
        lifecycle_status::text AS lifecycle_status,
        NULL::text AS functional_status,
        NULL::text AS branch_name,
        false AS active,
        created_at,
        updated_at
      `,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Employee not found');
    return toSummary(row);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for employee operations',
      );
    }
  }
}
