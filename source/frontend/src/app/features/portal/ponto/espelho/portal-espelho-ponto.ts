import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { PayrollBridgePreview, PontoFolhaService } from '../../../ponto/folha/ponto-folha.service';

@Component({
  selector: 'app-portal-espelho-ponto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './portal-espelho-ponto.html',
  styleUrl: './portal-espelho-ponto.scss',
})
export class PortalEspelhoPonto {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoFolhaService);

  readonly form = this.formBuilder.group({
    payrollRunId: ['', [Validators.required]],
    timesheetPeriodId: ['', [Validators.required]],
  });

  result: PayrollBridgePreview | null = null;
  loading = false;
  error = '';

  load(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.service
      .preview({
        payrollRunId: String(this.form.value.payrollRunId ?? ''),
        timesheetPeriodId: String(this.form.value.timesheetPeriodId ?? ''),
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.result = result;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o espelho de ponto.';
        },
      });
  }
}
