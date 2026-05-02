import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface PisPasepYear {
  employeeId: string;
  registration: string;
  employeeName: string;
  cpf: string | null;
  year: number;
  program: 'PIS' | 'PASEP';
  monthlyBase: Record<string, string>;
  totalBase: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PisPasepApiService {
  constructor(private readonly api: ApiClient) {}

  byEmployee(employeeId: string, year: number): Observable<PisPasepYear> {
    return this.api.get(`v1/admin/pis-pasep/${employeeId}?year=${year}`);
  }
}
