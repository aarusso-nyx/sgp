import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { IrrfTaxRateBracket, IrrfTaxRateImport, TaxRateIrrfService } from './tax-rate-irrf.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tax-rate-irrf',
  standalone: false,
  templateUrl: './tax-rate-irrf.html',
  styleUrl: './tax-rate-irrf.scss',
})
export class TaxRateIrrf implements OnInit {
  readonly brackets = signal<IrrfTaxRateBracket[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

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
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const items = await firstValueFrom(
        this.service.list(this.form.value.competenceStart || undefined),
      );
      this.brackets.set(items);
    } catch {
      this.error.set('Nao foi possivel carregar a tabela de IRRF.');
    } finally {
      this.loading.set(false);
    }
  }

  async importCsv(): Promise<void> {
    const parsed = this.parseCsv(String(this.form.value.csv ?? ''));
    if (parsed.length !== 5) {
      this.error.set('Informe cinco faixas no CSV.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const items = await firstValueFrom(
        this.service.importTable({
          competenceStart: String(this.form.value.competenceStart),
          competenceEnd: this.form.value.competenceEnd || null,
          referenceYear: String(this.form.value.referenceYear),
          brackets: parsed,
        }),
      );
      this.brackets.set(items);
      this.success.set('Tabela IRRF atualizada.');
    } catch {
      this.error.set('CSV invalido ou faixas sem continuidade.');
    } finally {
      this.loading.set(false);
    }
  }

  private parseCsv(csv: string): IrrfTaxRateImport['brackets'] {
    return csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [min = '', max = '', rate = '', deduction = '', dependent = ''] = line
          .split(';')
          .map((value) => value.trim());
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
