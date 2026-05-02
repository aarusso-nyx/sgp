import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

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
  private readonly http = inject(HttpClient);

  margin(employeeId: string, competence: string) {
    const params = new HttpParams().set('competence', competence);
    return this.http.get<ConsignmentMargin>(`/api/v1/employees/${employeeId}/consignment-margin`, {
      params,
    });
  }

  loans(employeeId: string) {
    return this.http.get<ConsignmentLoan[]>(`/api/v1/employees/${employeeId}/consignment-loans`);
  }
}
