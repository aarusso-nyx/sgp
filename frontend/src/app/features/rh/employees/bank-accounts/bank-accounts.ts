import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

interface BankAccountRow {
  id: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  validationStatus: string;
  validationErrorCode: string | null;
  updatedAt: string;
}

@Component({
  selector: 'app-rh-employee-bank-accounts',
  standalone: false,
  templateUrl: './bank-accounts.html',
  styleUrl: './bank-accounts.scss',
})
export class RhEmployeeBankAccounts {
  employeeId = '';
  rows: BankAccountRow[] = [];
  error = '';
  message = '';
  loading = false;

  constructor(private readonly http: HttpClient) {}

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.error = '';
    this.http
      .get<BankAccountRow[]>(`/api/v1/employees/${this.employeeId}/bank-accounts`)
      .subscribe({
        next: (rows) => {
          this.loading = false;
          this.rows = rows;
        },
        error: () => {
          this.loading = false;
          this.error = 'Nao foi possivel carregar os dados bancarios.';
        },
      });
  }

  revalidate(row: BankAccountRow): void {
    this.http
      .post<BankAccountRow>(
        `/api/v1/employees/${this.employeeId}/bank-accounts/${row.id}/revalidate`,
        {},
      )
      .subscribe({
        next: () => {
          this.message = 'Conta revalidada.';
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel revalidar a conta.';
        },
      });
  }
}
