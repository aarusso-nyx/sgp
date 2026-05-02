import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface YearlyIncomeBatchResult {
  batchId: string;
  status: string;
  fileCount: number;
  errorCount: number;
  files: Array<{ employeeId: string; fileId: string; fileHash: string }>;
}

@Injectable({ providedIn: 'root' })
export class ComprovantesRendimentosService {
  constructor(private readonly api: ApiClient) {}

  generate(yearBase: number): Observable<YearlyIncomeBatchResult> {
    return this.api.post('v1/admin/yearly-income-batches', { yearBase });
  }
}
