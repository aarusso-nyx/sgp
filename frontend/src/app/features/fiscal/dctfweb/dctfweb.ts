import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { DctfwebApiService, DctfwebDeclaration } from './dctfweb.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fiscal-dctfweb',
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
  templateUrl: './dctfweb.html',
  styleUrl: './dctfweb.scss',
})
export class FiscalDctfweb {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DctfwebApiService);

  readonly form = this.fb.nonNullable.group({
    year: [2026, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    month: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    kind: ['ORIGINAL' as 'ORIGINAL' | 'RETIFICADORA', Validators.required],
    originalDeclarationId: [''],
  });

  declarations: DctfwebDeclaration[] = [];
  selected: DctfwebDeclaration | null = null;
  loading = false;
  busyId = '';
  errorMessage = '';

  async load(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    const { year, month } = this.form.getRawValue();
    try {
      const items = await firstValueFrom(this.service.list(year, month));
      this.declarations = items;
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
    if (value.kind === 'RETIFICADORA' && !value.originalDeclarationId) {
      this.form.controls.originalDeclarationId.markAsTouched();
      return;
    }
    this.busyId = 'generate';
    this.errorMessage = '';
    try {
      const created = await firstValueFrom(
        this.service.generate({
          year: value.year,
          month: value.month,
          kind: value.kind,
          originalDeclarationId: value.originalDeclarationId || undefined,
        }),
      );
      this.upsert(created);
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  async sign(item: DctfwebDeclaration): Promise<void> {
    this.busyId = `sign:${item.id}`;
    this.errorMessage = '';
    try {
      this.upsert(await firstValueFrom(this.service.sign(item.id)));
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  async transmit(item: DctfwebDeclaration): Promise<void> {
    this.busyId = `transmit:${item.id}`;
    this.errorMessage = '';
    try {
      this.upsert(await firstValueFrom(this.service.transmit(item.id)));
    } catch (error: unknown) {
      this.fail(error);
    }
  }

  select(item: DctfwebDeclaration): void {
    this.selected = item;
  }

  isBusy(action: string, item?: DctfwebDeclaration): boolean {
    return this.busyId === (item ? `${action}:${item.id}` : action);
  }

  money(value: string): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }

  private upsert(item: DctfwebDeclaration): void {
    const index = this.declarations.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      this.declarations[index] = item;
    } else {
      this.declarations = [item, ...this.declarations];
    }
    this.selected = item;
    this.busyId = '';
    this.loading = false;
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : SGP_FEATURE_I18N_MESSAGES.m040;
    this.busyId = '';
    this.loading = false;
  }
}
