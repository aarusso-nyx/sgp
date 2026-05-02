import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface PayslipBatchResult {
  batchId: string;
  status: string;
  fileCount: number;
  errorCount: number;
}

@Injectable({ providedIn: 'root' })
export class ContrachequesService {
  constructor(private readonly api: ApiClient) {}

  generate(input: { payrollRunId: string; competence: string }): Observable<PayslipBatchResult> {
    return this.api.post('v1/admin/payslip-batches', input);
  }
}
