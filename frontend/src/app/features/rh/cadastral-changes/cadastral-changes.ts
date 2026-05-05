import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface CadastralChange {
  id: string;
  employeeName: string;
  registration: string;
  section: string;
  requestedPayload: Record<string, unknown>;
  requestedAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rh-cadastral-changes',
  standalone: false,
  templateUrl: './cadastral-changes.html',
  styleUrl: './cadastral-changes.scss',
})
export class RhCadastralChanges implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  changes: CadastralChange[] = [];
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
      .get<CadastralChange[]>('v1/funcionarios/cadastral-changes', { status: 'pending' })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (items) => {
          this.changes = items;
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m157;
        },
      });
  }

  approve(change: CadastralChange): void {
    this.savingId = change.id;
    this.api
      .post<Record<string, unknown>, Record<string, unknown>>(
        `v1/funcionarios/cadastral-changes/${change.id}/approve`,
        { notes: 'Aprovado pela fila cadastral.' },
      )
      .pipe(
        finalize(() => {
          this.savingId = '';
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m158;
          this.load();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m159;
        },
      });
  }

  reject(change: CadastralChange): void {
    this.savingId = change.id;
    this.api
      .post<Record<string, unknown>, Record<string, unknown>>(
        `v1/funcionarios/cadastral-changes/${change.id}/reject`,
        { reason: 'Rejeitado pela fila cadastral.' },
      )
      .pipe(
        finalize(() => {
          this.savingId = '';
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m160;
          this.load();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m161;
        },
      });
  }

  payload(change: CadastralChange): string {
    return JSON.stringify(change.requestedPayload, null, 2);
  }
}
