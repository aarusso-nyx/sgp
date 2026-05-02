import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  ESocialTabelasService,
  S1xxxDispatchResult,
  S1xxxEventKind,
  S1xxxStatus,
} from './esocial-tabelas.service';

const EVENT_KINDS: S1xxxEventKind[] = ['S-1000', 'S-1005', 'S-1010', 'S-1020', 'S-1050', 'S-1070'];

@Component({
  selector: 'app-esocial-tabelas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esocial-tabelas.html',
  styleUrl: './esocial-tabelas.scss',
})
export class ESocialTabelas implements OnInit, OnDestroy {
  private readonly service = inject(ESocialTabelasService);
  private readonly destroy$ = new Subject<void>();
  readonly eventKinds = EVENT_KINDS;
  statuses: S1xxxStatus[] = [];
  lastResults: S1xxxDispatchResult[] = [];
  loading = false;
  emitting = '';
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
    this.service
      .status()
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (statuses) => (this.statuses = statuses),
        error: () => (this.error = 'Nao foi possivel carregar as tabelas iniciais.'),
      });
  }

  emitAll(): void {
    this.emit('all');
    this.service
      .emitAll(true)
      .pipe(
        finalize(() => (this.emitting = '')),
        takeUntil(this.destroy$),
      )
      .subscribe(this.resultObserver());
  }

  emitOne(eventKind: S1xxxEventKind): void {
    this.emit(eventKind);
    this.service
      .emitOne(eventKind, true)
      .pipe(
        finalize(() => (this.emitting = '')),
        takeUntil(this.destroy$),
      )
      .subscribe(this.resultObserver());
  }

  statusFor(eventKind: S1xxxEventKind): S1xxxStatus | undefined {
    return this.statuses.find((status) => status.eventKind === eventKind);
  }

  private emit(marker: string): void {
    this.emitting = marker;
    this.error = '';
    this.lastResults = [];
  }

  private resultObserver() {
    return {
      next: (results: S1xxxDispatchResult[]) => {
        this.lastResults = results;
        this.load();
      },
      error: () => (this.error = 'Nao foi possivel emitir os deltas S-1xxx.'),
    };
  }
}
