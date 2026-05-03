import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AtsParameter, AtsParameterKey, AtsParametrosService } from './ats-parametros.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ats-parametros',
  standalone: false,
  templateUrl: './ats-parametros.html',
  styleUrl: './ats-parametros.scss',
})
export class AtsParametros implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly items = signal<AtsParameter[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly form = this.fb.group({
    key: ['ATS_PERCENT_PER_YEAR' as AtsParameterKey, Validators.required],
    value: ['', Validators.required],
    description: [''],
  });

  constructor(private readonly service: AtsParametrosService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const table = await firstValueFrom(this.service.list());
      this.items.set(table.items);
    } catch {
      this.error.set('Nao foi possivel carregar os parametros de ATS.');
    } finally {
      this.loading.set(false);
    }
  }

  edit(item: AtsParameter): void {
    this.form.patchValue({
      key: item.key,
      value: item.value,
      description: item.description,
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const table = await firstValueFrom(
        this.service.upsert({
          key: this.form.value.key as AtsParameterKey,
          value: String(this.form.value.value),
          description: this.form.value.description || undefined,
        }),
      );
      this.items.set(table.items);
      this.success.set('Parametro atualizado.');
    } catch {
      this.error.set('Valor invalido para o parametro.');
    } finally {
      this.loading.set(false);
    }
  }
}
