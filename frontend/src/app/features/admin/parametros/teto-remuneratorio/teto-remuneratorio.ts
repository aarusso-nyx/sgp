import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import {
  RemunerationCeiling,
  RemunerationCeilingKey,
  TetoRemuneratorioService,
} from './teto-remuneratorio.service';

const DEFAULT_KEY: RemunerationCeilingKey = 'TETO_PREFEITURA';

@Component({
  selector: 'app-teto-remuneratorio',
  standalone: false,
  templateUrl: './teto-remuneratorio.html',
  styleUrl: './teto-remuneratorio.scss',
})
export class TetoRemuneratorio implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ceilings: RemunerationCeiling[] = [];
  loading = false;
  error = '';
  success = '';
  immuneFlag = '';

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
      .list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (table) => {
          this.ceilings = table.items;
          this.immuneFlag = table.immuneFlag;
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar os subtetos.';
          this.loading = false;
        },
      });
  }

  edit(ceiling: RemunerationCeiling): void {
    this.form.patchValue({
      key: ceiling.key,
      amount: ceiling.amount ?? '',
      description: ceiling.description,
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.error = 'Informe chave e valor do subteto.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.service
      .upsert({
        key: this.form.value.key as RemunerationCeilingKey,
        amount: String(this.form.value.amount),
        description: this.form.value.description || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (table) => {
          this.ceilings = table.items;
          this.immuneFlag = table.immuneFlag;
          this.success = 'Subteto atualizado.';
          this.loading = false;
        },
        error: () => {
          this.error = 'Valor invalido para o subteto.';
          this.loading = false;
        },
      });
  }
}
