import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { RescisaoFolhaService, RescisaoResult } from './rescisao.service';

@Component({
  selector: 'app-rescisao-folha',
  standalone: false,
  templateUrl: './rescisao.html',
  styleUrl: './rescisao.scss',
})
export class RescisaoFolha {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RescisaoFolhaService);

  readonly causes = [
    { code: 'SEM_JUSTA_CAUSA', label: 'Sem justa causa' },
    { code: 'PEDIDO_DEMISSAO', label: 'Pedido de demissao' },
    { code: 'APOSENTADORIA', label: 'Aposentadoria' },
    { code: 'OUTRA', label: 'Outra' },
  ];

  readonly priorNoticeKinds = [
    { code: 'NONE', label: 'Sem aviso' },
    { code: 'WORKED', label: 'Trabalhado' },
    { code: 'INDEMNIFIED', label: 'Indenizado' },
  ];

  readonly reductionModes = [
    { code: 'NONE', label: 'Sem reducao' },
    { code: 'TWO_HOURS_DAY', label: 'Duas horas por dia' },
    { code: 'SEVEN_FINAL_DAYS', label: 'Sete dias finais' },
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
        this.errorMessage =
          error instanceof Error ? error.message : 'Nao foi possivel calcular a rescisao.';
        this.loading = false;
      },
    });
  }
}
