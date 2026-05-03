import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  ESocialFolhaPeriodicaService,
  ESocialPeriodicPayrollDispatchResult,
  ESocialPeriodicPayrollStatus,
} from './esocial-folha-periodica.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-folha-periodica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './esocial-folha-periodica.html',
  styleUrl: './esocial-folha-periodica.scss',
})
export class ESocialFolhaPeriodica implements OnInit, OnDestroy {
  private readonly service = inject(ESocialFolhaPeriodicaService);
  private readonly destroy$ = new Subject<void>();
  year = 2026;
  month = 1;
  rows: ESocialPeriodicPayrollStatus[] = [];
  lastResult: ESocialPeriodicPayrollDispatchResult[] = [];
  loading = false;
  emitting = '';
  error = '';

  ngOnInit(): void {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth() + 1;
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
      .status(this.year, this.month)
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (rows) => (this.rows = rows),
        error: () => (this.error = 'Nao foi possivel carregar a folha periodica.'),
      });
  }

  emitS1200(row: ESocialPeriodicPayrollStatus): void {
    this.run(row.employeeId, () => this.service.emitS1200(row.payrollRunId, row.employeeId));
  }

  emitS1210(row: ESocialPeriodicPayrollStatus): void {
    if (!row.paymentBatchId) return;
    const paymentBatchId = row.paymentBatchId;
    this.run(row.employeeId, () => this.service.emitS1210(paymentBatchId, row.employeeId));
  }

  reemitWorker(row: ESocialPeriodicPayrollStatus): void {
    this.run(row.employeeId, () => this.service.reemitWorker(row));
  }

  private run(
    marker: string,
    callback: () => ReturnType<ESocialFolhaPeriodicaService['emitS1200']>,
  ): void {
    this.emitting = marker;
    this.error = '';
    callback()
      .pipe(
        finalize(() => (this.emitting = '')),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.lastResult = result;
          this.load();
        },
        error: () => (this.error = 'Nao foi possivel emitir a folha periodica.'),
      });
  }
}
