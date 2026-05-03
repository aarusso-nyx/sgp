import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { FgtsAccount, FgtsApiService } from './fgts.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fgts',
  standalone: false,
  templateUrl: './fgts.html',
  styleUrl: './fgts.scss',
})
export class Fgts {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(FgtsApiService);

  readonly form = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    payrollRunId: [''],
  });

  accounts: FgtsAccount[] = [];
  errorMessage = '';
  loading = false;
  reprocessing = false;

  load(): void {
    if (!this.form.controls.employeeId.value) {
      this.form.controls.employeeId.markAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.service.byEmployee(this.form.controls.employeeId.value).subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage =
          error instanceof Error ? error.message : 'Nao foi possivel carregar o FGTS.';
        this.loading = false;
      },
    });
  }

  reprocess(): void {
    const payrollRunId = this.form.controls.payrollRunId.value;
    if (!payrollRunId) {
      this.form.controls.payrollRunId.markAsTouched();
      return;
    }
    this.reprocessing = true;
    this.errorMessage = '';
    this.service.reprocess(payrollRunId).subscribe({
      next: () => {
        this.reprocessing = false;
        this.load();
      },
      error: (error: unknown) => {
        this.errorMessage =
          error instanceof Error ? error.message : 'Nao foi possivel reprocessar a competencia.';
        this.reprocessing = false;
      },
    });
  }
}
