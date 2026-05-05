import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { RescisaoFolhaService, RescisaoResult } from './rescisao.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rescisao-folha',
  standalone: false,
  templateUrl: './rescisao.html',
  styleUrl: './rescisao.scss',
})
export class RescisaoFolha {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RescisaoFolhaService);

  readonly causes = [
    { code: 'SEM_JUSTA_CAUSA', label: SGP_FEATURE_I18N_MESSAGES.m055 },
    { code: 'PEDIDO_DEMISSAO', label: SGP_FEATURE_I18N_MESSAGES.m056 },
    { code: 'APOSENTADORIA', label: 'Aposentadoria' },
    { code: 'OUTRA', label: 'Outra' },
  ];

  readonly priorNoticeKinds = [
    { code: 'NONE', label: SGP_FEATURE_I18N_MESSAGES.m057 },
    { code: 'WORKED', label: 'Trabalhado' },
    { code: 'INDEMNIFIED', label: 'Indenizado' },
  ];

  readonly reductionModes = [
    { code: 'NONE', label: SGP_FEATURE_I18N_MESSAGES.m058 },
    { code: 'TWO_HOURS_DAY', label: SGP_FEATURE_I18N_MESSAGES.m059 },
    { code: 'SEVEN_FINAL_DAYS', label: SGP_FEATURE_I18N_MESSAGES.m060 },
  ];

  readonly form = this.fb.nonNullable.group({
    employmentLinkId: ['', Validators.required],
    terminationDate: ['', Validators.required],
    cause: ['SEM_JUSTA_CAUSA', Validators.required],
    priorNoticeKind: ['NONE', Validators.required],
    priorNoticeReductionMode: ['NONE', Validators.required],
  });

  result: RescisaoResult | null = null;
  errorMessage = '';
  loading = false;

  get fgtsFine() {
    return this.result?.components.find((row) => row.code === 'RESC_MULTA_FGTS_40') ?? null;
  }

  get priorNotice() {
    return (
      this.result?.components.find((row) =>
        ['RESC_AVISO_PREVIO', 'RESC_AVISO_PREVIO_DESCONTO'].includes(row.code),
      ) ?? null
    );
  }

  run(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.service.run(this.form.getRawValue()).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : SGP_FEATURE_I18N_MESSAGES.m061;
        this.loading = false;
      },
    });
  }
}
