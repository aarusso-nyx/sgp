import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client';

export interface ConsignmentMargin {
  employeeId: string;
  competence: string;
  netBase: string;
  availableGeneral: string;
  availableCard: string;
  usedGeneral: string;
  usedCard: string;
}

export interface ConsignmentLoan {
  loanId: string;
  consignmentEntityName: string;
  contractNumber: string;
  kind: string;
  monthlyAmount: string;
  installmentsTotal: number;
  installmentsPaid: number;
  remainingInstallments: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class ConsignadosService {
  private readonly api = inject(ApiClient);

  margin(employeeId: string, competence: string) {
    const params = new HttpParams().set('competence', competence);
    return this.api.get<ConsignmentMargin>(`/api/v1/employees/${employeeId}/consignment-margin`, {
      params,
    });
  }

  loans(employeeId: string) {
    return this.api.get<ConsignmentLoan[]>(`/api/v1/employees/${employeeId}/consignment-loans`);
  }
}
