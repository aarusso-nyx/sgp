import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { RppsTaxRateBracket, RppsTaxRateImport, TaxRateRppsService } from './tax-rate-rpps.service';

@Component({
  selector: 'app-tax-rate-rpps',
  standalone: false,
  templateUrl: './tax-rate-rpps.html',
  styleUrl: './tax-rate-rpps.scss',
})
export class TaxRateRpps implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  brackets: RppsTaxRateBracket[] = [];
  loading = false;
  error = '';
  success = '';

  form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: TaxRateRppsService,
  ) {
    this.form = this.fb.group({
      competenceStart: ['2025-01-01', Validators.required],
      competenceEnd: [''],
      referenceYear: ['2025', Validators.required],
      ceilingAmount: ['8157.41', Validators.required],
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
        next: (table) => {
          this.brackets = table.brackets;
          if (table.ceilingAmount) {
            this.form.patchValue({ ceilingAmount: table.ceilingAmount }, { emitEvent: false });
          }
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar a tabela de RPPS.';
          this.loading = false;
        },
      });
  }

  importCsv(): void {
    const parsed = this.parseCsv(String(this.form.value.csv ?? ''));
    if (parsed.length === 0) {
      this.error = 'Informe ao menos uma faixa no CSV.';
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
        ceilingAmount: this.form.value.ceilingAmount || null,
        brackets: parsed,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (table) => {
          this.brackets = table.brackets;
          this.success = 'Tabela RPPS atualizada.';
          this.loading = false;
        },
        error: () => {
          this.error = 'CSV invalido ou faixas sem continuidade.';
          this.loading = false;
        },
      });
  }

  private parseCsv(csv: string): RppsTaxRateImport['brackets'] {
    return csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [min, max, rate] = line.split(';').map((value) => value.trim());
        return {
          code: `RPPS-${this.form.value.referenceYear}-${String(index + 1).padStart(2, '0')}`,
          bracketMin: min,
          bracketMax: max || null,
          rate,
          deductionAmount: '0.00',
          dependentDeduction: '0.00',
        };
      });
  }
}
