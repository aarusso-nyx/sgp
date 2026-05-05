import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface PppRecord {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  snapshotJson: {
    environmentalExposures?: unknown[];
    epiDeliveries?: unknown[];
  };
  generatedAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-ppp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ppp.html',
  styleUrl: './ppp.scss',
})
export class SaudePpp implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    periodStart: ['', [Validators.required]],
    periodEnd: ['', [Validators.required]],
  });

  rows: PppRecord[] = [];
  saving = false;
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.rows = await firstValueFrom(this.api.get<PppRecord[]>('v1/saude/ppp'));
  }

  async generate(): Promise<void> {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving = true;
    this.error = '';
    try {
      await firstValueFrom(
        this.api.post<PppRecord, Record<string, unknown>>('v1/saude/ppp/gerar', this.form.value),
      );
      await this.load();
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m233;
    } finally {
      this.saving = false;
    }
  }
}
