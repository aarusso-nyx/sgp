import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Subject, forkJoin, finalize, takeUntil } from 'rxjs';

import {
  ESocialCircuitState,
  ESocialSubmissionBatch,
  ESocialSubmissaoService,
} from './esocial-submissao.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-submissao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esocial-submissao.html',
  styleUrl: './esocial-submissao.scss',
})
export class ESocialSubmissao implements OnInit, OnDestroy {
  private readonly service = inject(ESocialSubmissaoService);
  private readonly destroy$ = new Subject<void>();
  batches: ESocialSubmissionBatch[] = [];
  circuits: ESocialCircuitState[] = [];
  loading = false;
  retryingBatchId = '';
  error = '';

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
    forkJoin({
      batches: this.service.listBatches(),
      circuits: this.service.listCircuits(),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ batches, circuits }) => {
          this.batches = batches;
          this.circuits = circuits;
        },
        error: () => (this.error = 'Nao foi possivel carregar as submissoes.'),
      });
  }

  forceRetry(batch: ESocialSubmissionBatch): void {
    this.retryingBatchId = batch.batchId;
    this.error = '';
    this.service
      .forceRetry(batch.batchId)
      .pipe(
        finalize(() => (this.retryingBatchId = '')),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.load(),
        error: () => (this.error = 'Nao foi possivel forcar o retry.'),
      });
  }

  canRetry(batch: ESocialSubmissionBatch): boolean {
    return ['PENDING', 'RETRY', 'TIMEOUT', 'REJECTED'].includes(batch.status);
  }

  shortHash(hash: string | null): string {
    return hash ? hash.slice(0, 12) : '-';
  }

  eventCount(batch: ESocialSubmissionBatch): number {
    return batch.eventIds.length;
  }
}
