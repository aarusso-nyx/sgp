import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiClient } from '../../../core/api/api-client';

const BANKS = ['001', '033', '041', '104', '237', '341', '748', '756'];

@Component({
  selector: 'app-meus-dados-bancarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bancarios.html',
  styleUrl: './bancarios.scss',
})
export class MeusDadosBancarios {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(FormBuilder);

  readonly banks = BANKS;
  readonly form = this.formBuilder.nonNullable.group({
    employeeId: ['', Validators.required],
    bankCode: ['001', Validators.required],
    agency: ['', Validators.required],
    agencyDigit: [''],
    accountNumber: ['', Validators.required],
    accountDigit: ['', Validators.required],
    holderCpf: ['', Validators.required],
    holderKind: ['SELF', Validators.required],
    dependentId: [''],
  });

  saving = false;
  message = '';
  error = '';
  invalidField = '';

  submit(): void {
    if (this.form.invalid || !this.validateClientSide()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving = true;
    this.message = '';
    this.error = '';
    this.invalidField = '';
    this.api
      .post<Record<string, unknown>, Record<string, unknown>>(
        `v1/employees/${value.employeeId}/bank-accounts`,
        this.compact(value),
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.message = 'Dados bancarios validados.';
        },
        error: (response: HttpErrorResponse) => {
          this.saving = false;
          const code = String(response.error?.validation_error_code ?? '');
          this.invalidField = this.fieldFor(code);
          this.error = code || 'Nao foi possivel validar os dados bancarios.';
        },
      });
  }

  private validateClientSide(): boolean {
    const value = this.form.getRawValue();
    if (!BANKS.includes(value.bankCode)) {
      this.invalidField = 'bankCode';
      this.error = 'Banco sem regra de validacao.';
      return false;
    }
    if (value.bankCode !== '341' && value.agency.replace(/\D/g, '').length !== 4) {
      this.invalidField = 'agency';
      this.error = 'Agencia invalida para o banco informado.';
      return false;
    }
    return true;
  }

  private fieldFor(code: string): string {
    if (code.startsWith('AGENCY')) return 'agency';
    if (code.startsWith('ACCOUNT')) return 'accountNumber';
    if (code.includes('CPF')) return 'holderCpf';
    return 'bankCode';
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== ''));
  }
}
