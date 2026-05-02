import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { AtsParameter, AtsParameterKey, AtsParametrosService } from './ats-parametros.service';

@Component({
  selector: 'app-ats-parametros',
  standalone: false,
  templateUrl: './ats-parametros.html',
  styleUrl: './ats-parametros.scss',
})
export class AtsParametros implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);

  items: AtsParameter[] = [];
  loading = false;
  error = '';
  success = '';

  readonly form = this.fb.group({
    key: ['ATS_PERCENT_PER_YEAR' as AtsParameterKey, Validators.required],
    value: ['', Validators.required],
    description: [''],
  });

  constructor(private readonly service: AtsParametrosService) {}

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
          this.items = table.items;
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar os parametros de ATS.';
          this.loading = false;
        },
      });
  }

  edit(item: AtsParameter): void {
    this.form.patchValue({
      key: item.key,
      value: item.value,
      description: item.description,
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.service
      .upsert({
        key: this.form.value.key as AtsParameterKey,
        value: String(this.form.value.value),
        description: this.form.value.description || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (table) => {
          this.items = table.items;
          this.success = 'Parametro atualizado.';
          this.loading = false;
        },
        error: () => {
          this.error = 'Valor invalido para o parametro.';
          this.loading = false;
        },
      });
  }
}
