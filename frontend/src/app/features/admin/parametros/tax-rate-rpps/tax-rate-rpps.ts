import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { RppsTaxRateBracket, RppsTaxRateImport, TaxRateRppsService } from './tax-rate-rpps.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tax-rate-rpps',
  standalone: false,
  templateUrl: './tax-rate-rpps.html',
  styleUrl: './tax-rate-rpps.scss',
})
export class TaxRateRpps implements OnInit {
  readonly brackets = signal<RppsTaxRateBracket[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

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
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const table = await firstValueFrom(
        this.service.list(this.form.value.competenceStart || undefined),
      );
      this.brackets.set(table.brackets);
      if (table.ceilingAmount) {
        this.form.patchValue({ ceilingAmount: table.ceilingAmount }, { emitEvent: false });
      }
    } catch {
      this.error.set('Nao foi possivel carregar a tabela de RPPS.');
    } finally {
      this.loading.set(false);
    }
  }

  async importCsv(): Promise<void> {
    const parsed = this.parseCsv(String(this.form.value.csv ?? ''));
    if (parsed.length === 0) {
      this.error.set('Informe ao menos uma faixa no CSV.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const table = await firstValueFrom(
        this.service.importTable({
          competenceStart: String(this.form.value.competenceStart),
          competenceEnd: this.form.value.competenceEnd || null,
          referenceYear: String(this.form.value.referenceYear),
          ceilingAmount: this.form.value.ceilingAmount || null,
          brackets: parsed,
        }),
      );
      this.brackets.set(table.brackets);
      this.success.set('Tabela RPPS atualizada.');
    } catch {
      this.error.set('CSV invalido ou faixas sem continuidade.');
    } finally {
      this.loading.set(false);
    }
  }

  private parseCsv(csv: string): RppsTaxRateImport['brackets'] {
    return csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [min = '', max = '', rate = ''] = line.split(';').map((value) => value.trim());
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
