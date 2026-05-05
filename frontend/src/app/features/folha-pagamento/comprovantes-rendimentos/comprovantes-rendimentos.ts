import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import {
  ComprovantesRendimentosService,
  YearlyIncomeBatchResult,
} from './comprovantes-rendimentos.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-comprovantes-rendimentos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './comprovantes-rendimentos.html',
  styleUrl: './comprovantes-rendimentos.scss',
})
export class ComprovantesRendimentos {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ComprovantesRendimentosService);

  readonly form = this.fb.nonNullable.group({
    yearBase: [
      new Date().getFullYear() - 1,
      [Validators.required, Validators.min(2000), Validators.max(2100)],
    ],
  });

  result?: YearlyIncomeBatchResult;
  errorMessage = '';
  loading = false;

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.result = undefined;
    this.service.generate(this.form.controls.yearBase.value).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : SGP_FEATURE_I18N_MESSAGES.m044;
        this.loading = false;
      },
    });
  }
}
