import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

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
export class ESocialSubmissao implements OnInit {
  private readonly service = inject(ESocialSubmissaoService);
  batches: ESocialSubmissionBatch[] = [];
  circuits: ESocialCircuitState[] = [];
  loading = false;
  retryingBatchId = '';
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const { batches, circuits } = await firstValueFrom(
        forkJoin({
          batches: this.service.listBatches(),
          circuits: this.service.listCircuits(),
        }),
      );
      this.batches = batches;
      this.circuits = circuits;
    } catch {
      this.error = 'Nao foi possivel carregar as submissoes.';
    } finally {
      this.loading = false;
    }
  }

  async forceRetry(batch: ESocialSubmissionBatch): Promise<void> {
    this.retryingBatchId = batch.batchId;
    this.error = '';
    try {
      await firstValueFrom(this.service.forceRetry(batch.batchId));
      await this.load();
    } catch {
      this.error = 'Nao foi possivel forcar o retry.';
    } finally {
      this.retryingBatchId = '';
    }
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
