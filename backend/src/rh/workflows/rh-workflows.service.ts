import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { BusinessDaysService } from '../../consultas/business-days.service';
import { DatabaseService } from '../../database/database.service';
import { RhRequestDto, RhWorkflowMutationDto } from './rh-workflows.dto';
import { WorkflowMutationService } from './workflow-mutation.service';
import { WorkflowQueryService } from './workflow-query.service';
import { WorkflowRequestService } from './workflow-request.service';
import { LookupRow } from './workflow-types';

@Injectable()
export class RhWorkflowsService {
  private readonly mutations: WorkflowMutationService;
  private readonly queries: WorkflowQueryService;
  private readonly requests: WorkflowRequestService;

  constructor(
    private readonly databaseService: DatabaseService,
    businessDaysService?: BusinessDaysService,
  ) {
    this.mutations = new WorkflowMutationService(
      databaseService,
      businessDaysService,
    );
    this.queries = new WorkflowQueryService(databaseService);
    this.requests = new WorkflowRequestService(databaseService);
  }

  listDefinitions() {
    return this.queries.listDefinitions();
  }

  async listWorkflow(
    workflowKey: string,
    query: DomainListQueryDto,
    employeeId?: string,
  ): Promise<PagedResponse<Record<string, unknown>>> {
    this.ensureDatabase();
    return this.queries.listWorkflow(workflowKey, query, employeeId);
  }

  async createWorkflowRecord(
    workflowKey: string,
    input: RhWorkflowMutationDto,
    employeeId?: string,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const definition = this.queries.requireWorkflow(workflowKey);
    const effectiveEmployeeId = employeeId ?? input.employeeId;
    if (definition.employeeScoped && !effectiveEmployeeId) {
      this.mutations.require(effectiveEmployeeId, 'employeeId');
    }

    await this.mutations.insertRecord(
      definition.key,
      input,
      effectiveEmployeeId,
    );
    return this.queries.findLatest(definition, effectiveEmployeeId);
  }

  async updateWorkflowRecord(
    workflowKey: string,
    id: string,
    input: RhWorkflowMutationDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const definition = this.queries.requireWorkflow(workflowKey);
    await this.mutations.updateRecord(definition.key, id, input);
    return this.queries.findById(definition, id);
  }

  async deleteWorkflowRecord(
    workflowKey: string,
    id: string,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const definition = this.queries.requireWorkflow(workflowKey);
    const existing = await this.queries.findById(definition, id);
    if (definition.activeDelete) {
      await this.databaseService.query(
        `UPDATE hr.${definition.table} SET ${definition.activeDelete} WHERE id = $1::uuid`,
        [id],
      );
      return this.queries.findById(definition, id);
    }
    await this.databaseService.query(
      `DELETE FROM hr.${definition.table} WHERE id = $1::uuid`,
      [id],
    );
    return { ...existing, deleted: true };
  }

  async listLookup(
    kind: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<LookupRow>> {
    this.ensureDatabase();
    return this.queries.listLookup(kind, query);
  }

  async createImportRequest(kind: string, input: RhRequestDto) {
    this.ensureDatabase();
    return this.requests.createImportRequest(kind, input);
  }

  async createReportRequest(reportKey: string, input: RhRequestDto) {
    this.ensureDatabase();
    return this.requests.createReportRequest(reportKey, input);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for RH workflow operations',
      );
    }
  }
}
