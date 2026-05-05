import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PayrollBridgePreview, PontoFolhaService } from '../../../ponto/folha/ponto-folha.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  async load(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      this.result = await firstValueFrom(
        this.service.preview({
          payrollRunId: String(this.form.value.payrollRunId ?? ''),
          timesheetPeriodId: String(this.form.value.timesheetPeriodId ?? ''),
        }),
      );
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m152;
    } finally {
      this.loading = false;
    }
  }
}
