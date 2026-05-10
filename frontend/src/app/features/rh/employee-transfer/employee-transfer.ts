import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface EmployeeTransfer {
  id: string;
  employeeId: string;
  destinoWorkLocationId: string;
  tipo: string;
  dataEfeito: string;
  status: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rh-employee-transfer',
  standalone: false,
  templateUrl: './employee-transfer.html',
  styleUrl: './employee-transfer.scss',
})
export class RhEmployeeTransfer implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly statuses = ['solicitada', 'aprovada', 'efetivada'];
  queues: Record<string, EmployeeTransfer[]> = {
    solicitada: [],
    aprovada: [],
    efetivada: [],
  };
  loading = false;
  savingId = '';
  error = '';
  message = '';

  constructor(private readonly api: ApiClient) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api
      .get<EmployeeTransfer[]>('v1/rh/employee-transfer')
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (items) => {
          this.queues = { solicitada: [], aprovada: [], efetivada: [] };
          for (const item of items) {
            const queue = this.queues[item.status];
            if (queue) queue.push(item);
          }
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m162;
        },
      });
  }

  approve(item: EmployeeTransfer): void {
    this.transition(item, 'aprovar', 'Movimentacao aprovada.');
  }

  effect(item: EmployeeTransfer): void {
    this.transition(item, 'efetivar', 'Movimentacao efetivada.');
  }

  private transition(
    item: EmployeeTransfer,
    action: 'aprovar' | 'efetivar',
    message: string,
  ): void {
    this.savingId = item.id;
    this.api
      .post<EmployeeTransfer, Record<string, never>>(
        `v1/rh/employee-transfer/${item.id}/${action}`,
        {},
      )
      .pipe(
        finalize(() => {
          this.savingId = '';
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = message;
          this.load();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m163;
        },
      });
  }
}
