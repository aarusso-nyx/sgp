import { BadRequestException, NotFoundException } from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { LOOKUPS, WORKFLOWS } from './workflow-definitions';
import {
  CountRow,
  LookupRow,
  WorkflowDefinition,
  WorkflowRow,
} from './workflow-types';
import { toIso } from './workflow-utils';

export class WorkflowQueryService {
  constructor(private readonly databaseService: DatabaseService) {}

  listDefinitions() {
    return WORKFLOWS.map(({ key, label, legacyRoute, employeeScoped }) => ({
      key,
      label,
      legacyRoute,
      employeeScoped,
    }));
  }

  async listWorkflow(
    workflowKey: string,
    query: DomainListQueryDto,
    employeeId?: string,
  ): Promise<PagedResponse<Record<string, unknown>>> {
    const definition = this.requireWorkflow(workflowKey);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [];
    const clauses: string[] = [];

    if (employeeId) {
      if (!definition.employeeScoped) {
        throw new BadRequestException('Workflow is not employee scoped');
      }
      values.push(employeeId);
      clauses.push(`employee_id = $${values.length}::uuid`);
    }
    if (query.search) {
      values.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`${definition.search} LIKE $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const count = await this.databaseService.query<CountRow>(
      `SELECT count(*)::text AS total FROM ${definition.from} ${where}`,
      values,
    );
    const rows = await this.databaseService.query<WorkflowRow>(
      `SELECT ${definition.select} FROM ${definition.from} ${where} ORDER BY ${definition.orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    );
    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toRecord(definition.key, row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async listLookup(
    kind: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<LookupRow>> {
    const lookup = LOOKUPS[kind];
    if (!lookup) throw new NotFoundException(`Lookup not found: ${kind}`);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [];
    const where = query.search
      ? (values.push(`%${query.search.toLowerCase()}%`),
        `WHERE ${lookup.search} LIKE $1`)
      : '';
    const count = await this.databaseService.query<CountRow>(
      `SELECT count(*)::text AS total FROM ${lookup.table} ${where}`,
      values,
    );
    const rows = await this.databaseService.query<LookupRow>(
      `SELECT id::text, code::text, ${lookup.name}::text AS name, '{}'::jsonb AS metadata FROM ${lookup.table} ${where} ORDER BY code ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    );
    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows,
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async findLatest(
    definition: WorkflowDefinition,
    employeeId?: string,
  ): Promise<Record<string, unknown>> {
    const where = employeeId ? 'WHERE employee_id = $1::uuid' : '';
    const rows = await this.databaseService.query<WorkflowRow>(
      `SELECT * FROM (SELECT ${definition.select} FROM ${definition.from}) records ${where} ORDER BY created_at DESC LIMIT 1`,
      employeeId ? [employeeId] : [],
    );
    if (!rows[0]) throw new NotFoundException('Workflow record not found');
    return this.toRecord(definition.key, rows[0]);
  }

  async findById(
    definition: WorkflowDefinition,
    id: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.databaseService.query<WorkflowRow>(
      `SELECT * FROM (SELECT ${definition.select} FROM ${definition.from}) records WHERE id = $1::uuid LIMIT 1`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Workflow record not found');
    return this.toRecord(definition.key, rows[0]);
  }

  requireWorkflow(key: string): WorkflowDefinition {
    const found = WORKFLOWS.find((workflow) => workflow.key === key);
    if (!found) throw new NotFoundException(`Workflow not found: ${key}`);
    return found;
  }

  private toRecord(key: string, row: WorkflowRow): Record<string, unknown> {
    return {
      id: row.id,
      workflow: key,
      employeeId: row.employee_id,
      employeeRegistration: row.employee_registration,
      employeeName: row.employee_name,
      title: row.title,
      subtitle: row.subtitle,
      startsOn: row.starts_on ? toIso(row.starts_on) : null,
      endsOn: row.ends_on ? toIso(row.ends_on) : null,
      status: row.status,
      metadata: row.metadata ?? {},
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    };
  }
}
