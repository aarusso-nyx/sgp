import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { PayrollSimulationResult, SimulacaoFolhaService } from './simulacao.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-folha-simulacao',
  standalone: false,
  templateUrl: './simulacao.html',
  styleUrl: './simulacao.scss',
})
export class SimulacaoFolha {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SimulacaoFolhaService);

  readonly form = this.fb.nonNullable.group({
    tenantId: ['', Validators.required],
    employmentLinkId: ['', Validators.required],
    competence: ['2026-05-01', Validators.required],
    baseSalary: [''],
    dependentCount: [''],
    rubricId: [''],
    rubricAmount: [''],
    rubricQuantity: ['1.0000'],
  });

  result: PayrollSimulationResult | null = null;
  errorMessage = '';
  loading = false;

  run(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.loading = true;
    this.errorMessage = '';
    this.result = null;
    this.service
      .run({
        tenantId: value.tenantId,
        employmentLinkId: value.employmentLinkId,
        competence: value.competence,
        overrides: {
          ...(value.baseSalary ? { baseSalary: value.baseSalary } : {}),
          ...(value.dependentCount ? { dependentCount: Number(value.dependentCount) } : {}),
          ...(value.rubricId ? { rubricId: value.rubricId } : {}),
          ...(value.rubricAmount ? { rubricAmount: value.rubricAmount } : {}),
          ...(value.rubricQuantity ? { rubricQuantity: value.rubricQuantity } : {}),
        },
      })
      .subscribe({
        next: (result) => {
          this.result = result;
          this.loading = false;
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error ? error.message : SGP_FEATURE_I18N_MESSAGES.m073;
          this.loading = false;
        },
      });
  }
}
