import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { PagedResult } from '../../../core/models/paged-result';

export interface TransparencyPayrollRow {
  competence: string;
  employeePublicId: string;
  fullName: string;
  registrationNumber: string;
  positionName: string;
  organizationalUnit: string;
  grossTotal: string;
  deductionsTotal: string;
  netTotal: string;
}

export interface TransparencyFilters {
  tenantId: string;
  competence?: string;
  organizationalUnit?: string;
  position?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TransparenciaService {
  constructor(private readonly api: ApiClient) {}

  list(filters: TransparencyFilters): Observable<PagedResult<TransparencyPayrollRow>> {
    const { tenantId, ...query } = filters;
    return this.api.list<TransparencyPayrollRow>(`v1/public/transparency/${tenantId}/payroll`, query);
  }

  csvUrl(filters: TransparencyFilters): string {
    const { tenantId, ...query } = filters;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }
    const config = (window as unknown as { SGP_CONFIG?: Record<string, string> }).SGP_CONFIG;
    const baseUrl = (config?.['API_BASE_URL'] ?? '').replace(/\/$/, '');
    const basePath = (config?.['API_BASE_PATH'] ?? '/api').replace(/\/$/, '');
    const queryString = params.toString();
    return `${baseUrl}${basePath}/v1/public/transparency/${tenantId}/payroll.csv${
      queryString ? `?${queryString}` : ''
    }`;
  }
}
