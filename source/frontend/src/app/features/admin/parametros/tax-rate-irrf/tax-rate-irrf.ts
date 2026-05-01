import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { IrrfTaxRateBracket, IrrfTaxRateImport, TaxRateIrrfService } from './tax-rate-irrf.service';

@Component({
  selector: 'app-tax-rate-irrf',
  standalone: false,
  templateUrl: './tax-rate-irrf.html',
  styleUrl: './tax-rate-irrf.scss',
})
export class TaxRateIrrf implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  brackets: IrrfTaxRateBracket[] = [];
  loading = false;
  error = '';
  success = '';

  form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: TaxRateIrrfService,
  ) {
    this.form = this.fb.group({
      competenceStart: ['2025-01-01', Validators.required],
      competenceEnd: [''],
      referenceYear: ['2025', Validators.required],
      csv: [''],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service
      .list(this.form.value.competenceStart || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.brackets = items;
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar a tabela de IRRF.';
          this.loading = false;
        },
      });
  }

  importCsv(): void {
    const parsed = this.parseCsv(String(this.form.value.csv ?? ''));
    if (parsed.length !== 5) {
      this.error = 'Informe cinco faixas no CSV.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.service
      .importTable({
        competenceStart: String(this.form.value.competenceStart),
        competenceEnd: this.form.value.competenceEnd || null,
        referenceYear: String(this.form.value.referenceYear),
        brackets: parsed,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.brackets = items;
          this.success = 'Tabela IRRF atualizada.';
          this.loading = false;
        },
        error: () => {
          this.error = 'CSV invalido ou faixas sem continuidade.';
          this.loading = false;
        },
      });
  }

  private parseCsv(csv: string): IrrfTaxRateImport['brackets'] {
    return csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [min, max, rate, deduction, dependent] = line.split(';').map((value) => value.trim());
        return {
          code: `IRRF-${this.form.value.referenceYear}-${String(index + 1).padStart(2, '0')}`,
          bracketMin: min,
          bracketMax: max || null,
          rate,
          deductionAmount: deduction,
          dependentDeduction: dependent,
        };
      });
  }
}
