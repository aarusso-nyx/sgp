import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

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
            if (this.queues[item.status]) this.queues[item.status].push(item);
          }
        },
        error: () => {
          this.error = 'Nao foi possivel carregar as movimentacoes.';
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
          this.error = 'Nao foi possivel atualizar a movimentacao.';
        },
      });
  }
}
