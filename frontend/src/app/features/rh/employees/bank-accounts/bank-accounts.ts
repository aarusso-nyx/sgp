import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ApiClient } from '../../../../core/api/api-client';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  constructor(private readonly api: ApiClient) {}

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.error = '';
    this.api.get<BankAccountRow[]>(`/api/v1/employees/${this.employeeId}/bank-accounts`).subscribe({
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
    this.api
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
