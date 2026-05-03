import {
  ConflictException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { MasterDataMutationDto } from './master-data.dto';
import {
  addStatusInsert,
  addStatusUpdate,
  deactivateAssignment,
  pgErrorCode,
  placeholders,
  pushAssignment,
  returningSql,
  rowToRecord,
  searchWhere,
  selectSql,
} from './master-data.resource-sql';
import { RESOURCE_SQL } from './master-data.sql-mappings';
import {
  CountRow,
  MasterDataRecord,
  ResourceSqlMapping,
  SqlRow,
  WriteMapping,
} from './master-data.types';

export interface MasterDataResourceService {
  listRecords(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<MasterDataRecord>>;
  createRecord(input: MasterDataMutationDto): Promise<MasterDataRecord>;
  updateRecord(
    id: string,
    input: MasterDataMutationDto,
  ): Promise<MasterDataRecord>;
  deactivateRecord(id: string): Promise<MasterDataRecord>;
}

export function createMasterDataResourceServices(
  database: DatabaseService,
): Record<string, MasterDataResourceService> {
  return Object.fromEntries(
    Object.entries(RESOURCE_SQL).map(([resource, mapping]) => [
      resource,
      new SqlMasterDataResourceService(resource, database, mapping),
    ]),
  );
}

class SqlMasterDataResourceService implements MasterDataResourceService {
  constructor(
    private readonly resource: string,
    private readonly database: DatabaseService,
    private readonly mapping: ResourceSqlMapping,
  ) {}

  async listRecords(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<MasterDataRecord>> {
    this.requireDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [];
    const where = searchWhere(
      this.mapping.searchExpression,
      query.search,
      values,
      this.mapping.baseWhere,
    );
    const select = selectSql(this.mapping);

    try {
      const countRows = await this.database.query<CountRow>(
        `SELECT count(*)::text AS total FROM ${this.mapping.table} ${where}`,
        values,
      );
      const rows = await this.database.query<SqlRow>(
        `${select} ${where} ORDER BY code ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, offset],
      );
      const total = Number(countRows[0]?.total ?? '0');

      return {
        items: rows.map((row) => rowToRecord(row)),
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.rethrowPostgresAvailability(error);
    }
  }

  async createRecord(input: MasterDataMutationDto): Promise<MasterDataRecord> {
    this.requireDatabase();
    const mapping = this.requireWritableMapping();
    const write = mapping.write;
    if (!write) throw new NotImplementedException(this.resource);

    try {
      const row = await this.insertRecord(mapping, write, input);
      return rowToRecord(row);
    } catch (error) {
      this.rethrowWriteError(error, input.code);
    }
  }

  async updateRecord(
    id: string,
    input: MasterDataMutationDto,
  ): Promise<MasterDataRecord> {
    this.requireDatabase();
    const mapping = this.requireWritableMapping();
    const write = mapping.write;
    if (!write) throw new NotImplementedException(this.resource);

    try {
      const row = await this.updateRecordRow(mapping, write, id, input);
      if (!row) {
        throw new NotFoundException(`Master data record not found: ${id}`);
      }
      return rowToRecord(row);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.rethrowWriteError(error, input.code);
    }
  }

  async deactivateRecord(id: string): Promise<MasterDataRecord> {
    this.requireDatabase();
    const mapping = this.requireWritableMapping();
    const write = mapping.write;
    if (!write) throw new NotImplementedException(this.resource);
    if (write.statusMode === 'always-active') {
      throw new NotImplementedException(
        `Master-data resource cannot be deactivated because it has no inactive status: ${this.resource}`,
      );
    }

    try {
      const row = await this.deactivateRecordRow(mapping, write, id);
      if (!row) {
        throw new NotFoundException(`Master data record not found: ${id}`);
      }
      return rowToRecord(row);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.rethrowPostgresAvailability(error);
    }
  }

  private requireWritableMapping(): ResourceSqlMapping {
    if (!this.mapping.writable) {
      throw new NotImplementedException(
        `Master-data resource requires a dedicated PostgreSQL workflow endpoint: ${this.resource}`,
      );
    }
    return this.mapping;
  }

  private requireDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required; runtime master-data persistence is PostgreSQL-only.',
      );
    }
  }

  private async insertRecord(
    mapping: ResourceSqlMapping,
    write: WriteMapping,
    input: MasterDataMutationDto,
  ): Promise<SqlRow> {
    const columns = [write.codeColumn];
    const values: unknown[] = [input.code.trim()];

    if (write.nameColumn) {
      columns.push(write.nameColumn);
      values.push(input.name.trim());
    }
    if (write.descriptionColumn) {
      columns.push(write.descriptionColumn);
      values.push(input.description?.trim() ?? input.name.trim());
    }
    addStatusInsert(columns, values, write, input.active ?? true);

    if (write.extraInsertColumns?.length) {
      columns.push(...write.extraInsertColumns);
      values.push(...(write.extraInsertValues?.(input) ?? []));
    }

    const rows = await this.database.query<SqlRow>(
      `INSERT INTO ${mapping.table} (${columns.join(', ')})
       VALUES (${placeholders(columns, write, mapping).join(', ')})
       RETURNING ${returningSql(mapping)}`,
      values,
    );
    return rows[0]!;
  }

  private async updateRecordRow(
    mapping: ResourceSqlMapping,
    write: WriteMapping,
    id: string,
    input: MasterDataMutationDto,
  ): Promise<SqlRow | undefined> {
    const values: unknown[] = [id];
    const assignments: string[] = [];

    pushAssignment(assignments, values, write.codeColumn, input.code.trim());
    if (write.nameColumn) {
      pushAssignment(assignments, values, write.nameColumn, input.name.trim());
    }
    if (write.descriptionColumn) {
      pushAssignment(
        assignments,
        values,
        write.descriptionColumn,
        input.description?.trim() ?? input.name.trim(),
      );
    }
    addStatusUpdate(assignments, values, write, input.active ?? true);

    if (write.extraUpdateAssignments?.length) {
      const extraValues = write.extraUpdateValues?.(input) ?? [];
      write.extraUpdateAssignments.forEach((column, index) => {
        pushAssignment(
          assignments,
          values,
          column,
          extraValues[index],
          mapping.table,
        );
      });
    }

    const rows = await this.database.query<SqlRow>(
      `UPDATE ${mapping.table}
          SET ${assignments.join(', ')}, updated_at = now()
        WHERE id = $1::uuid${mapping.baseWhere ? ` AND ${mapping.baseWhere}` : ''}
        RETURNING ${returningSql(mapping)}`,
      values,
    );
    return rows[0];
  }

  private async deactivateRecordRow(
    mapping: ResourceSqlMapping,
    write: WriteMapping,
    id: string,
  ): Promise<SqlRow | undefined> {
    const rows = await this.database.query<SqlRow>(
      `UPDATE ${mapping.table}
          SET ${deactivateAssignment(write)}, updated_at = now()
        WHERE id = $1::uuid${mapping.baseWhere ? ` AND ${mapping.baseWhere}` : ''}
        RETURNING ${returningSql(mapping)}`,
      [id],
    );
    return rows[0];
  }

  private rethrowWriteError(error: unknown, code: string): never {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException(`Master data code already exists: ${code}`);
    }
    this.rethrowPostgresAvailability(error);
  }

  private rethrowPostgresAvailability(error: unknown): never {
    const code = this.pgErrorCode(error);
    if (['42P01', '42703', '42704'].includes(code ?? '')) {
      throw new ServiceUnavailableException(
        `PostgreSQL schema is not migrated for master-data resource: ${this.resource}`,
      );
    }
    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    return pgErrorCode(error) === '23505';
  }

  private pgErrorCode(error: unknown): string | undefined {
    return pgErrorCode(error);
  }
}
