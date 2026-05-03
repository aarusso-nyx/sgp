import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { PayrollSimulationResult, SimulacaoFolhaService } from './simulacao.service';

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
          baseSalary: value.baseSalary || undefined,
          dependentCount: value.dependentCount ? Number(value.dependentCount) : undefined,
          rubricId: value.rubricId || undefined,
          rubricAmount: value.rubricAmount || undefined,
          rubricQuantity: value.rubricQuantity || undefined,
        },
      })
      .subscribe({
        next: (result) => {
          this.result = result;
          this.loading = false;
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error ? error.message : 'Nao foi possivel simular a folha.';
          this.loading = false;
        },
      });
  }
}
