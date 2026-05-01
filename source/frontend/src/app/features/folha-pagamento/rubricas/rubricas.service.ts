import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { PagedResult } from '../../../core/models/paged-result';

export interface RubricaAttribute {
  id?: string;
  name: string;
  type: 'decimal' | 'int' | 'bool' | 'date' | 'text';
  defaultValue?: string | null;
  required?: boolean;
}

export interface RubricaRecord {
  id: string;
  code: string;
  description: string;
  type: 'provento' | 'desconto' | 'informativa' | 'base';
  taxable: boolean;
  active: boolean;
  incidences: Record<string, unknown>;
  startsOn: string;
  endsOn: string | null;
  formulaAlias: string | null;
  formulaExpression: string | null;
  formulaReady: boolean;
  formulaError: string | null;
  attributes: RubricaAttribute[];
}

export interface RubricaMutation {
  code: string;
  description: string;
  type: RubricaRecord['type'];
  taxable: boolean;
  active: boolean;
  incidences: Record<string, unknown>;
  startsOn: string;
  endsOn?: string | null;
  formulaAlias?: string | null;
  formulaExpression?: string | null;
  esocialCode?: string | null;
  officialRubricCode?: string | null;
  attributes: RubricaAttribute[];
}

export interface RubricaPreview {
  rubricaId: string;
  employeeId: string;
  competence: string;
  amount: string | null;
  attributes: Record<string, unknown>;
}

export interface JobPositionRubrica {
  id: string;
  jobPositionId: string;
  jobPositionCode: string | null;
  jobPositionName: string | null;
  rubricaId: string;
  rubricaCode: string | null;
  rubricaDescription: string | null;
  startsOn: string | null;
  endsOn: string | null;
  applicationCondition: string;
}

@Injectable({
  providedIn: 'root',
})
export class RubricasService {
  constructor(private readonly api: ApiClient) {}

  list(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    incidence?: string;
  }): Observable<PagedResult<RubricaRecord>> {
    return this.api.list<RubricaRecord>('v1/folha/rubrica', query);
  }

  create(body: RubricaMutation): Observable<RubricaRecord> {
    return this.api.post<RubricaRecord, RubricaMutation>('v1/folha/rubrica', body);
  }

  update(id: string, body: RubricaMutation): Observable<RubricaRecord> {
    return this.api.patch<RubricaRecord, RubricaMutation>(`v1/folha/rubrica/${id}`, body);
  }

  validateFormula(expression: string): Observable<{ ready: boolean; error: string | null }> {
    return this.api.post('v1/folha/rubrica/compile', { expression });
  }

  preview(
    id: string,
    body: {
      employeeId: string;
      competenceYear: number;
      competenceMonth: number;
      attributes: Record<string, unknown>;
    },
  ): Observable<RubricaPreview> {
    return this.api.post(`v1/folha/rubrica/${id}/preview`, body);
  }

  listJobPositionLinks(): Observable<JobPositionRubrica[]> {
    return this.api.get<JobPositionRubrica[]>('v1/folha/rubrica/links/job-positions');
  }

  linkJobPosition(body: {
    jobPositionId: string;
    rubricaId: string;
    startsOn: string;
    endsOn?: string | null;
    applicationCondition?: string;
  }): Observable<JobPositionRubrica> {
    return this.api.post('v1/folha/rubrica/links/job-positions', body);
  }
}
