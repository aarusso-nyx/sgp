import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface PayrollSimulationInput {
  tenantId: string;
  employmentLinkId: string;
  competence: string;
  overrides: {
    baseSalary?: string;
    dependentCount?: number;
    rubricId?: string;
    rubricAmount?: string;
    rubricQuantity?: string;
  };
}

export interface PayrollSimulationLine {
  earningDeductionId: string;
  code: string;
  description: string;
  kind: string;
  currentAmount: string;
  amount: string;
  delta: string;
  quantity: string;
  source: string;
}

export interface PayrollSimulationResult {
  tenantId: string;
  employmentLinkId: string;
  competence: string;
  totals: {
    currentNet: string;
    simulatedNet: string;
    netDelta: string;
  };
  lines: PayrollSimulationLine[];
}

@Injectable({ providedIn: 'root' })
export class SimulacaoFolhaService {
  constructor(private readonly api: ApiClient) {}

  run(input: PayrollSimulationInput): Observable<PayrollSimulationResult> {
    return this.api.post('v1/folha/simulacao', input);
  }
}
