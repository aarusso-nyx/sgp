import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  ESocialReturnFailure,
  ESocialReturnStatus,
  ESocialRetornosService,
} from './esocial-retornos.service';

@Component({
  selector: 'app-esocial-retornos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esocial-retornos.html',
  styleUrl: './esocial-retornos.scss',
})
export class ESocialRetornos implements OnInit, OnDestroy {
  private readonly service = inject(ESocialRetornosService);
  private readonly destroy$ = new Subject<void>();
  failures: ESocialReturnFailure[] = [];
  selected: ESocialReturnFailure | null = null;
  loading = false;
  actionEventId = '';
  activeStatus: ESocialReturnStatus | '' = '';
  error = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(status: ESocialReturnStatus | '' = this.activeStatus): void {
    this.loading = true;
    this.error = '';
    this.activeStatus = status;
    this.service
      .listFailures(status || undefined)
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (failures) => {
          this.failures = failures;
          this.selected =
            failures.find((failure) => failure.eventId === this.selected?.eventId) ??
            failures[0] ??
            null;
        },
        error: () => (this.error = 'Nao foi possivel carregar os retornos.'),
      });
  }

  select(failure: ESocialReturnFailure): void {
    this.selected = failure;
  }

  forceRetry(failure: ESocialReturnFailure): void {
    this.actionEventId = failure.eventId;
    this.error = '';
    this.service
      .forceRetry(failure.eventId)
      .pipe(
        finalize(() => (this.actionEventId = '')),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.load(),
        error: () => (this.error = 'Nao foi possivel forcar o retry.'),
      });
  }

  markHandled(failure: ESocialReturnFailure): void {
    this.actionEventId = failure.eventId;
    this.error = '';
    this.service
      .markHandled(failure.eventId)
      .pipe(
        finalize(() => (this.actionEventId = '')),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.load(),
        error: () => (this.error = 'Nao foi possivel marcar como tratado.'),
      });
  }

  definitiveFailures(): ESocialReturnFailure[] {
    return this.failures.filter((failure) => failure.status === 'ERRO_DEFINITIVO');
  }

  recoverableFailures(): ESocialReturnFailure[] {
    return this.failures.filter((failure) => failure.status === 'ERRO_TECNICO_RETENTAVEL');
  }

  canMarkHandled(failure: ESocialReturnFailure): boolean {
    return failure.status === 'ERRO_DEFINITIVO';
  }

  canRetry(failure: ESocialReturnFailure): boolean {
    return failure.status === 'ERRO_TECNICO_RETENTAVEL';
  }

  shortId(value: string): string {
    return value.slice(0, 8);
  }
}
