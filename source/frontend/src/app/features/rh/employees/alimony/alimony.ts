import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

interface AlimonyRow {
  id: string;
  courtOrderNumber: string | null;
  beneficiaryName: string;
  beneficiaryCpf: string | null;
  beneficiaryBankCode: number | null;
  beneficiaryBranch: string | null;
  beneficiaryAccount: string | null;
  calculationBasis: string;
  rate: string | null;
  fixedAmount: string | null;
  validFrom: string;
  validTo: string | null;
  priority: number;
  status: string;
}

@Component({
  selector: 'app-rh-employee-alimony',
  standalone: false,
  templateUrl: './alimony.html',
  styleUrl: './alimony.scss',
})
export class RhEmployeeAlimony {
  employeeId = '';
  status = 'ACTIVE';
  rows: AlimonyRow[] = [];
  error = '';
  message = '';
  loading = false;

  form = {
    courtOrderNumber: '',
    beneficiaryName: '',
    beneficiaryCpf: '',
    beneficiaryBankCode: 1,
    beneficiaryBranch: '',
    beneficiaryAccount: '',
    judicialAccount: true,
    calculationBasis: 'GROSS',
    rate: '',
    fixedAmount: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: '',
    priority: 1,
    notes: '',
  };

  constructor(private readonly http: HttpClient) {}

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.error = '';
    this.http
      .get<AlimonyRow[]>(
        `/api/v1/employees/${this.employeeId}/alimonies?status=${this.status}`,
      )
      .subscribe({
        next: (rows) => {
          this.rows = rows;
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar as ordens de pensao.';
          this.loading = false;
        },
      });
  }

  create(): void {
    if (!this.employeeId) return;
    const body = {
      ...this.form,
      beneficiaryCpf: this.form.beneficiaryCpf || undefined,
      rate: this.form.rate || undefined,
      fixedAmount: this.form.fixedAmount || undefined,
      validTo: this.form.validTo || undefined,
      baseSpecificCodes: [],
    };
    this.http
      .post<AlimonyRow>(`/api/v1/employees/${this.employeeId}/alimonies`, body)
      .subscribe({
        next: () => {
          this.message = 'Ordem de pensao cadastrada.';
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel cadastrar a ordem de pensao.';
        },
      });
  }

  suspend(row: AlimonyRow): void {
    const body = {
      ...row,
      judicialAccount: true,
      courtOrderNumber: row.courtOrderNumber ?? '',
      beneficiaryCpf: row.beneficiaryCpf ?? undefined,
      beneficiaryBankCode: row.beneficiaryBankCode ?? 0,
      beneficiaryBranch: row.beneficiaryBranch ?? '',
      beneficiaryAccount: row.beneficiaryAccount ?? '',
      rate: row.rate ?? undefined,
      fixedAmount: row.fixedAmount ?? undefined,
      validTo: row.validTo ?? undefined,
      status: 'SUSPENDED',
      baseSpecificCodes: [],
    };
    this.http
      .patch<AlimonyRow>(
        `/api/v1/employees/${this.employeeId}/alimonies/${row.id}`,
        body,
      )
      .subscribe({
        next: () => {
          this.message = 'Ordem suspensa.';
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel suspender a ordem.';
        },
      });
  }
}
