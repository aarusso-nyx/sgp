import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../../core/api/api-client';

export interface RescisaoComponentLine {
  code: string;
  kind: string;
  amount: string;
  referenceValue: string;
  quantity: string;
}

export interface RescisaoResult {
  payrollRunId: string;
  employmentLinkId: string;
  employeeId: string;
  terminationDate: string;
  cause: string;
  status: string;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
  components: RescisaoComponentLine[];
}

export interface RescisaoRequest {
  employmentLinkId: string;
  terminationDate: string;
  cause: string;
}

@Injectable({ providedIn: 'root' })
export class RescisaoFolhaService {
  constructor(private readonly api: ApiClient) {}

  run(input: RescisaoRequest): Observable<RescisaoResult> {
    return this.api.post('v1/folhas/rescisao/calcular', input);
  }
}
