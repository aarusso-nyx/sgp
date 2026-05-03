import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  RemunerationCeiling,
  RemunerationCeilingKey,
  TetoRemuneratorioService,
} from './teto-remuneratorio.service';

const DEFAULT_KEY: RemunerationCeilingKey = 'TETO_PREFEITURA';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-teto-remuneratorio',
  standalone: false,
  templateUrl: './teto-remuneratorio.html',
  styleUrl: './teto-remuneratorio.scss',
})
export class TetoRemuneratorio implements OnInit {
  readonly ceilings = signal<RemunerationCeiling[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly immuneFlag = signal('');

  form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: TetoRemuneratorioService,
  ) {
    this.form = this.fb.group({
      key: [DEFAULT_KEY, Validators.required],
      amount: ['', Validators.required],
      description: [''],
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const table = await firstValueFrom(this.service.list());
      this.ceilings.set(table.items);
      this.immuneFlag.set(table.immuneFlag);
    } catch {
      this.error.set('Nao foi possivel carregar os subtetos.');
    } finally {
      this.loading.set(false);
    }
  }

  edit(ceiling: RemunerationCeiling): void {
    this.form.patchValue({
      key: ceiling.key,
      amount: ceiling.amount ?? '',
      description: ceiling.description,
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Informe chave e valor do subteto.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const table = await firstValueFrom(
        this.service.upsert({
          key: this.form.value.key as RemunerationCeilingKey,
          amount: String(this.form.value.amount),
          description: this.form.value.description || undefined,
        }),
      );
      this.ceilings.set(table.items);
      this.immuneFlag.set(table.immuneFlag);
      this.success.set('Subteto atualizado.');
    } catch {
      this.error.set('Valor invalido para o subteto.');
    } finally {
      this.loading.set(false);
    }
  }
}
