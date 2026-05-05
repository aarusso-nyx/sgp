import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface EnvironmentalExposure {
  id: string;
  employeeId: string;
  employeeName: string | null;
  riskManagementProgramId: string;
  harmfulAgentCode: string;
  agentKind: string;
  intensityValue: string | null;
  intensityUnit: string;
  exposureStart: string;
  exposureEnd: string | null;
  pendingEvents: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-exposicoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exposicoes.html',
  styleUrl: './exposicoes.scss',
})
export class SaudeExposicoes implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    riskManagementProgramId: ['', [Validators.required]],
    harmfulAgentCode: ['01.01.001', [Validators.required]],
    agentKind: ['FISICO', [Validators.required]],
    intensityValue: [88],
    intensityUnit: ['dB(A)'],
    exposureStart: ['', [Validators.required]],
    exposureEnd: [''],
    mitigatedByEpi: [false],
    mitigatedByEpc: [false],
    specialRetirementEligible: [false],
  });

  rows: EnvironmentalExposure[] = [];
  saving = false;
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.rows = await firstValueFrom(this.api.get<EnvironmentalExposure[]>('v1/saude/exposicoes'));
  }

  async create(): Promise<void> {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving = true;
    this.error = '';
    try {
      await firstValueFrom(
        this.api.post<EnvironmentalExposure, Record<string, unknown>>(
          'v1/saude/exposicoes',
          this.compact(this.form.value),
        ),
      );
      await this.load();
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m227;
    } finally {
      this.saving = false;
    }
  }

  async close(row: EnvironmentalExposure): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await firstValueFrom(
      this.api.patch<EnvironmentalExposure, Record<string, string>>(
        `v1/saude/exposicoes/${row.id}`,
        {
          exposureEnd: today,
        },
      ),
    );
    await this.load();
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== '' && entry !== undefined),
    );
  }
}
