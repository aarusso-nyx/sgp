import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { OpenApiClient } from '../../../core/api/generated/openapi-client';
import { PagedResult } from '../../../core/models/paged-result';

export interface RhWorkflowDefinition {
  key: string;
  label: string;
  legacyRoute: string;
  employeeScoped: boolean;
}

export interface RhWorkflowRecord {
  id: string;
  workflow: string;
  employeeId: string | null;
  employeeRegistration: string | null;
  employeeName: string | null;
  title: string;
  subtitle: string;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RhEmployeeRecord {
  id: string;
  registration: string;
  name: string;
  cpf: string | null;
  email: string | null;
  lifecycleStatus: string;
  functionalStatus: string | null;
  branch: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RhMutation extends Record<string, unknown> {}

export interface RhQuery extends Record<string, string | number | boolean | undefined> {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface RhRequestSummary {
  id: string;
  status: string;
  requestedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class RhWorkflows {
  constructor(private readonly api: OpenApiClient) {}

  listWorkflowDefinitions(): Observable<RhWorkflowDefinition[]> {
    return of([
      {
        key: 'employee-dossier',
        label: 'Dossie do Funcionario',
        legacyRoute: '#!/funcionario/dossie',
        employeeScoped: true,
      },
      {
        key: 'medical-report',
        label: 'Laudo de Prontuario',
        legacyRoute: '#!/pericia/prontuario/laudo',
        employeeScoped: true,
      },
      {
        key: 'recadastramento-receipt',
        label: 'Comprovante de Recadastramento',
        legacyRoute: '#!/recadastramento/comprovante',
        employeeScoped: true,
      },
    ]);
  }

  listEmployees(query: RhQuery = {}): Observable<PagedResult<RhEmployeeRecord>> {
    return this.api.getApiV1AdminUsuarios(query).pipe(
      map((result) => {
        const items = this.extractItems(result).map((item) => this.toEmployee(item));
        return {
          items,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 25,
          total: items.length,
          totalPages: 1,
        };
      }),
    );
  }

  createEmployee(body: RhMutation): Observable<RhEmployeeRecord> {
    return this.api.postApiV1AdminUsuarios(body).pipe(map((result) => this.toEmployee(result)));
  }

  updateEmployee(id: string, body: RhMutation): Observable<RhEmployeeRecord> {
    return this.api
      .patchApiV1AdminUsuariosById({ id }, body)
      .pipe(map((result) => this.toEmployee({ ...(result as object), id })));
  }

  deactivateEmployee(id: string): Observable<RhEmployeeRecord> {
    return this.api
      .patchApiV1AdminUsuariosById({ id }, { status: 'INACTIVE' })
      .pipe(map((result) => this.toEmployee({ ...(result as object), id, status: 'INACTIVE' })));
  }

  listWorkflow(workflow: string, query: RhQuery = {}): Observable<PagedResult<RhWorkflowRecord>> {
    return of({
      items: [],
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      total: 0,
      totalPages: 0,
    });
  }

  createWorkflow(workflow: string, body: RhMutation): Observable<RhWorkflowRecord> {
    return of(this.toWorkflowRecord({ workflow, ...body, id: crypto.randomUUID() }));
  }

  updateWorkflow(workflow: string, id: string, body: RhMutation): Observable<RhWorkflowRecord> {
    return of(this.toWorkflowRecord({ workflow, ...body, id }));
  }

  deleteWorkflow(workflow: string, id: string): Observable<RhWorkflowRecord> {
    return of(this.toWorkflowRecord({ workflow, id, status: 'INACTIVE' }));
  }

  requestImport(kind: string, body: RhMutation = {}): Observable<RhRequestSummary> {
    return of({
      id: crypto.randomUUID(),
      status: 'REQUESTED',
      requestedAt: new Date().toISOString(),
    });
  }

  requestReport(reportKey: string, body: RhMutation = {}): Observable<RhRequestSummary> {
    return of({
      id: crypto.randomUUID(),
      status: 'REQUESTED',
      requestedAt: new Date().toISOString(),
    });
  }

  private extractItems(result: unknown): Record<string, unknown>[] {
    if (Array.isArray(result)) {
      return result as Record<string, unknown>[];
    }
    const value = result as { items?: unknown };
    if (Array.isArray(value?.items)) {
      return value.items as Record<string, unknown>[];
    }
    return [];
  }

  private toEmployee(raw: unknown): RhEmployeeRecord {
    const value = (raw ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    const status = String(value['status'] ?? value['lifecycleStatus'] ?? 'ACTIVE');
    return {
      id: String(value['id'] ?? ''),
      registration: String(value['registration'] ?? value['login'] ?? ''),
      name: String(value['name'] ?? ''),
      cpf: value['cpf'] ? String(value['cpf']) : null,
      email: value['email'] ? String(value['email']) : null,
      lifecycleStatus: status,
      functionalStatus: null,
      branch: null,
      active: status !== 'INACTIVE' && status !== 'LOCKED' && status !== 'TERMINATED',
      createdAt: String(value['createdAt'] ?? now),
      updatedAt: String(value['updatedAt'] ?? now),
    };
  }

  private toWorkflowRecord(raw: Record<string, unknown>): RhWorkflowRecord {
    const now = new Date().toISOString();
    return {
      id: String(raw['id'] ?? ''),
      workflow: String(raw['workflow'] ?? ''),
      employeeId: raw['employeeId'] ? String(raw['employeeId']) : null,
      employeeRegistration: null,
      employeeName: null,
      title: String(raw['title'] ?? raw['name'] ?? ''),
      subtitle: String(raw['subtitle'] ?? ''),
      startsOn: raw['startsOn'] ? String(raw['startsOn']) : null,
      endsOn: raw['endsOn'] ? String(raw['endsOn']) : null,
      status: String(raw['status'] ?? 'ACTIVE'),
      metadata: raw,
      createdAt: now,
      updatedAt: now,
    };
  }
}
