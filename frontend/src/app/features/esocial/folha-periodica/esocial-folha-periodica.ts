import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

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
export class ESocialFolhaPeriodica implements OnInit {
  private readonly service = inject(ESocialFolhaPeriodicaService);
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
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.rows = await firstValueFrom(this.service.status(this.year, this.month));
    } catch {
      this.error = 'Nao foi possivel carregar a folha periodica.';
    } finally {
      this.loading = false;
    }
  }

  emitS1200(row: ESocialPeriodicPayrollStatus): void {
    void this.run(row.employeeId, () => this.service.emitS1200(row.payrollRunId, row.employeeId));
  }

  emitS1210(row: ESocialPeriodicPayrollStatus): void {
    if (!row.paymentBatchId) return;
    const paymentBatchId = row.paymentBatchId;
    void this.run(row.employeeId, () => this.service.emitS1210(paymentBatchId, row.employeeId));
  }

  reemitWorker(row: ESocialPeriodicPayrollStatus): void {
    void this.run(row.employeeId, () => this.service.reemitWorker(row));
  }

  private async run(
    marker: string,
    callback: () => ReturnType<ESocialFolhaPeriodicaService['emitS1200']>,
  ): Promise<void> {
    this.emitting = marker;
    this.error = '';
    try {
      this.lastResult = await firstValueFrom(callback());
      await this.load();
    } catch {
      this.error = 'Nao foi possivel emitir a folha periodica.';
    } finally {
      this.emitting = '';
    }
  }
}
