import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import {
  RemessaBancariaService,
  RemittanceSummary,
} from './remessa-bancaria.service';

@Component({
  selector: 'app-remessa-bancaria',
  standalone: false,
  templateUrl: './remessa-bancaria.html',
  styleUrl: './remessa-bancaria.scss',
})
export class RemessaBancaria {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RemessaBancariaService);

  private readonly current = new Date();
  readonly form = this.fb.nonNullable.group({
    year: [
      this.current.getFullYear(),
      [Validators.required, Validators.min(2000), Validators.max(2100)],
    ],
    month: [
      this.current.getMonth() + 1,
      [Validators.required, Validators.min(1), Validators.max(12)],
    ],
    payrollRunId: ['', Validators.required],
    bankId: ['001', Validators.required],
    paymentDate: [''],
  });

  remittances: RemittanceSummary[] = [];
  errorMessage = '';
  infoMessage = '';
  loading = false;

  load(): void {
    if (this.form.controls.year.invalid || this.form.controls.month.invalid) {
      this.form.controls.year.markAsTouched();
      this.form.controls.month.markAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.service
      .list(Number(this.form.controls.year.value), Number(this.form.controls.month.value))
      .subscribe({
        next: (page) => {
          this.remittances = page.items;
          this.loading = false;
        },
        error: (error: unknown) => {
          this.errorMessage = this.messageFrom(error, 'Nao foi possivel listar remessas.');
          this.loading = false;
        },
      });
  }

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.infoMessage = '';
    this.service
      .generate({
        payrollRunId: this.form.controls.payrollRunId.value.trim(),
        bankId: this.form.controls.bankId.value.trim(),
        paymentDate: this.form.controls.paymentDate.value.trim() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.infoMessage = `Solicitacao ${result.requestId} registrada.`;
          this.loading = false;
          this.load();
        },
        error: (error: unknown) => {
          this.errorMessage = this.messageFrom(error, 'Nao foi possivel gerar a remessa.');
          this.loading = false;
        },
      });
  }

  download(remittance: RemittanceSummary): void {
    if (!remittance.attachmentId) return;
    this.service.download(remittance.attachmentId).subscribe({
      next: (download) => {
        window.location.href = download.downloadUrl;
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error, 'Nao foi possivel baixar a remessa.');
      },
    });
  }

  private messageFrom(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message;
    return fallback;
  }
}
