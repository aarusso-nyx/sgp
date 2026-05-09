import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';

interface ApprovalQueueItem {
  kind: 'leave' | 'vacation';
  id: string;
  employeeRegistration: string;
  employeeName: string;
  title: string;
  startsOn: string;
  endsOn: string | null;
  days: number | null;
  status: string;
  requestedAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-minha-equipe',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minha-equipe.html',
  styleUrl: './minha-equipe.scss',
})
export class MinhaEquipe implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  queue: ApprovalQueueItem[] = [];
  loading = false;
  actingId = '';
  message = '';
  error = '';

  ngOnInit(): void {
    this.loadQueue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadQueue(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .get<ApprovalQueueItem[]>('v1/portal/minha-equipe/aprovacoes')
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (queue) => {
          this.queue = queue;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar a fila de aprovacoes.';
        },
      });
  }

  approve(item: ApprovalQueueItem): void {
    this.transition(item, 'aprovar');
  }

  cancel(item: ApprovalQueueItem): void {
    this.transition(item, 'cancelar');
  }

  private transition(item: ApprovalQueueItem, action: 'aprovar' | 'cancelar'): void {
    this.actingId = item.id;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .post<unknown, Record<string, never>>(
        `v1/portal/minha-equipe/aprovacoes/${item.kind}/${item.id}/${action}`,
        {},
      )
      .pipe(
        finalize(() => {
          this.actingId = '';
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.queue = this.queue.filter(
            (candidate) => candidate.kind !== item.kind || candidate.id !== item.id,
          );
          this.message = action === 'aprovar' ? 'Solicitacao aprovada.' : 'Solicitacao cancelada.';
        },
        error: () => {
          this.error = 'Nao foi possivel atualizar a solicitacao.';
        },
      });
  }
}
