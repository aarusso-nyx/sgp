import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import {
  DecimoTerceiroProcessamentosService,
  DecimoTerceiroRunResult,
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
  });

  preview: { action: 'adiantamento' | 'fechamento'; year: number; label: string } | null = null;
  result: DecimoTerceiroRunResult | null = null;
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
    this.errorMessage = '';
  }

  cancelReview(): void {
    this.preview = null;
  }

  approve(): void {
    if (!this.preview) return;
    this.loading = true;
    this.errorMessage = '';
    const request =
      this.preview.action === 'adiantamento'
        ? this.service.runAdiantamento(this.preview.year)
        : this.service.runFechamento(this.preview.year);

    request.subscribe({
      next: (result) => {
        this.result = result;
        this.preview = null;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage =
          error instanceof Error ? error.message : 'Nao foi possivel processar o 13o.';
        this.loading = false;
      },
    });
  }
}
