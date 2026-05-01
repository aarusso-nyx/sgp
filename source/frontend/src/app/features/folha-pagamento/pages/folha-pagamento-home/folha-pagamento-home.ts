import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import {
  DecimoTerceiroProcessamentosService,
  DecimoTerceiroRunResult,
  FeriasRunResult,
  PayrollRunExecutionHistory,
} from '../../processamentos/decimo-terceiro.service';

@Component({
  selector: 'app-folha-pagamento-home',
  standalone: false,
  templateUrl: './folha-pagamento-home.html',
  styleUrl: './folha-pagamento-home.scss',
})
export class FolhaPagamentoHome {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DecimoTerceiroProcessamentosService);

  readonly currentYear = new Date().getFullYear();
  readonly form = this.fb.nonNullable.group({
    year: [this.currentYear, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    vacationRecordId: [''],
  });

  preview: {
    action: 'adiantamento' | 'fechamento' | 'ferias';
    year: number;
    label: string;
    vacationRecordId?: string;
  } | null = null;
  result: DecimoTerceiroRunResult | null = null;
  feriasResult: FeriasRunResult | null = null;
  executionHistory: PayrollRunExecutionHistory[] = [];
  errorMessage = '';
  loading = false;

  review(action: 'adiantamento' | 'fechamento'): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const year = Number(this.form.controls.year.value);
    this.preview = {
      action,
      year,
      label: action === 'adiantamento' ? 'Gerar 1a parcela 13o' : 'Fechar 13o',
    };
    this.result = null;
    this.feriasResult = null;
    this.executionHistory = [];
    this.errorMessage = '';
  }

  reviewFerias(): void {
    const vacationRecordId = this.form.controls.vacationRecordId.value.trim();
    if (!vacationRecordId) {
      this.form.controls.vacationRecordId.markAsTouched();
      return;
    }
    this.preview = {
      action: 'ferias',
      year: Number(this.form.controls.year.value),
      label: 'Calcular folha de ferias',
      vacationRecordId,
    };
    this.result = null;
    this.feriasResult = null;
    this.executionHistory = [];
    this.errorMessage = '';
  }

  cancelReview(): void {
    this.preview = null;
  }

  approve(): void {
    if (!this.preview) return;
    this.loading = true;
    this.errorMessage = '';
    const request = this.buildRequest(this.preview);
    request.subscribe({
      next: (result) => {
        if ('vacationRecordId' in result) {
          this.feriasResult = result;
        } else {
          this.result = result;
        }
        this.loadExecutionHistory(result.payrollRunId);
        this.preview = null;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage =
          error instanceof Error ? error.message : 'Nao foi possivel processar a folha.';
        this.loading = false;
      },
    });
  }

  private buildRequest(
    preview: NonNullable<FolhaPagamentoHome['preview']>,
  ): Observable<DecimoTerceiroRunResult | FeriasRunResult> {
    if (preview.action === 'ferias') {
      return this.service.runFerias(preview.vacationRecordId ?? '');
    }
    if (preview.action === 'adiantamento') {
      return this.service.runAdiantamento(preview.year);
    }
    return this.service.runFechamento(preview.year);
  }

  private loadExecutionHistory(payrollRunId: string): void {
    this.service.getExecutionHistory(payrollRunId).subscribe({
      next: (history) => {
        this.executionHistory = history;
      },
      error: () => {
        this.executionHistory = [];
      },
    });
  }
}
