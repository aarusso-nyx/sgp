import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

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
export class SaudeExposicoes implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

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
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api
      .get<EnvironmentalExposure[]>('v1/saude/exposicoes')
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.rows = rows));
  }

  create(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving = true;
    this.error = '';
    this.api
      .post<EnvironmentalExposure, Record<string, unknown>>(
        'v1/saude/exposicoes',
        this.compact(this.form.value),
      )
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.load(),
        error: () => (this.error = 'Nao foi possivel salvar a exposicao.'),
      });
  }

  close(row: EnvironmentalExposure): void {
    const today = new Date().toISOString().slice(0, 10);
    this.api
      .patch<EnvironmentalExposure, Record<string, string>>(`v1/saude/exposicoes/${row.id}`, {
        exposureEnd: today,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load());
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== '' && entry !== undefined),
    );
  }
}
