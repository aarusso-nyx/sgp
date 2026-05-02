import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { ContrachequesService, PayslipBatchResult } from './contracheques.service';

@Component({
  selector: 'app-contracheques',
  standalone: false,
  templateUrl: './contracheques.html',
  styleUrl: './contracheques.scss',
})
export class Contracheques {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContrachequesService);
  private readonly current = new Date();

  readonly form = this.fb.nonNullable.group({
    competence: [
      `${this.current.getFullYear()}-${String(this.current.getMonth() + 1).padStart(2, '0')}-01`,
      Validators.required,
    ],
    payrollRunId: ['', Validators.required],
  });

  result?: PayslipBatchResult;
  errorMessage = '';
  loading = false;

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.result = undefined;
    this.service
      .generate({
        competence: this.form.controls.competence.value,
        payrollRunId: this.form.controls.payrollRunId.value.trim(),
      })
      .subscribe({
        next: (result) => {
          this.result = result;
          this.loading = false;
        },
        error: (error: unknown) => {
          this.errorMessage = this.messageFrom(error, 'Nao foi possivel gerar os contracheques.');
          this.loading = false;
        },
      });
  }

  private messageFrom(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message;
    return fallback;
  }
}
