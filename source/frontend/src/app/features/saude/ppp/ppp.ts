import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

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
  selector: 'app-saude-ppp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ppp.html',
  styleUrl: './ppp.scss',
})
export class SaudePpp implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    periodStart: ['', [Validators.required]],
    periodEnd: ['', [Validators.required]],
  });

  rows: PppRecord[] = [];
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
      .get<PppRecord[]>('v1/saude/ppp')
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.rows = rows));
  }

  generate(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving = true;
    this.error = '';
    this.api
      .post<PppRecord, Record<string, unknown>>('v1/saude/ppp/gerar', this.form.value)
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.load(),
        error: () => (this.error = 'Nao foi possivel gerar o PPP.'),
      });
  }
}
