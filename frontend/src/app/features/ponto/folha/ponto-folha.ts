import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { PayrollBridgePreview, PontoFolhaService } from './ponto-folha.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ponto-folha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-folha.html',
  styleUrl: './ponto-folha.scss',
})
export class PontoFolha {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoFolhaService);

  readonly form = this.formBuilder.group({
    payrollRunId: ['', [Validators.required]],
    timesheetPeriodId: ['', [Validators.required]],
  });

  previewResult: PayrollBridgePreview | null = null;
  loading = false;
  applying = false;
  error = '';
  message = '';

  preview(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.message = '';
    this.service
      .preview(this.payload())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.previewResult = result;
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m117;
        },
      });
  }

  apply(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.applying = true;
    this.error = '';
    this.service
      .apply(this.payload())
      .pipe(finalize(() => (this.applying = false)))
      .subscribe({
        next: (result) => {
          this.previewResult = result;
          this.message = result.alreadyApplied
            ? 'Lancamento ja aplicado.'
            : 'Linhas aplicadas a folha.';
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m118;
        },
      });
  }

  private payload(): { payrollRunId: string; timesheetPeriodId: string } {
    return {
      payrollRunId: String(this.form.value.payrollRunId ?? ''),
      timesheetPeriodId: String(this.form.value.timesheetPeriodId ?? ''),
    };
  }
}
