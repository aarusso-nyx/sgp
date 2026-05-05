import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { DirfApiService, DirfArquivo } from './dirf.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

const DIRF_DEPRECATED_FROM_YEAR_BASE = 2025;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fiscal-dirf',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './dirf.html',
  styleUrl: './dirf.scss',
})
export class FiscalDirf {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DirfApiService);

  readonly form = this.fb.nonNullable.group({
    yearBase: [2026, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    kind: ['ORIGINAL' as 'ORIGINAL' | 'RETIFICADORA', Validators.required],
    originalArquivoId: [''],
  });

  arquivos: DirfArquivo[] = [];
  selected: DirfArquivo | null = null;
  loading = false;
  busy = false;
  errorMessage = '';

  async load(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    try {
      const items = await firstValueFrom(this.service.list(this.form.getRawValue().yearBase));
      this.arquivos = items;
      this.selected = items[0] ?? null;
      this.loading = false;
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  async generate(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (!this.canGenerateDirf(value.yearBase)) {
      return;
    }
    if (value.kind === 'RETIFICADORA' && !value.originalArquivoId) {
      this.form.controls.originalArquivoId.markAsTouched();
      return;
    }
    this.busy = true;
    this.errorMessage = '';
    try {
      const created = await firstValueFrom(
        this.service.generate({
          yearBase: value.yearBase,
          kind: value.kind,
          originalArquivoId: value.originalArquivoId || undefined,
        }),
      );
      this.upsert(created);
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  select(item: DirfArquivo): void {
    this.selected = item;
  }

  downloadUrl(item: DirfArquivo): string {
    const basePath = '/api/v1/admin/fiscal/dirf';
    return `${basePath}/${item.id}/txt`;
  }

  canGenerateDirf(yearBase = this.form.getRawValue().yearBase): boolean {
    return yearBase < DIRF_DEPRECATED_FROM_YEAR_BASE;
  }

  money(value: string): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }

  private upsert(item: DirfArquivo): void {
    const index = this.arquivos.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      this.arquivos[index] = item;
    } else {
      this.arquivos = [item, ...this.arquivos];
    }
    this.selected = item;
    this.busy = false;
    this.loading = false;
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : SGP_FEATURE_I18N_MESSAGES.m041;
    this.busy = false;
    this.loading = false;
  }
}
