import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  ESocialExcludableEvent,
  ESocialExclusaoService,
  S3000RequestStatus,
} from './esocial-exclusao.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-exclusao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './esocial-exclusao.html',
  styleUrl: './esocial-exclusao.scss',
})
export class ESocialExclusao implements OnInit, OnDestroy {
  private readonly service = inject(ESocialExclusaoService);
  private readonly destroy$ = new Subject<void>();

  events: ESocialExcludableEvent[] = [];
  requests: S3000RequestStatus[] = [];
  selected: ESocialExcludableEvent | null = null;
  justification = '';
  loading = false;
  submitting = false;
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
      .events()
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (rows) => (this.events = rows),
        error: () => (this.error = 'Nao foi possivel carregar eventos elegiveis.'),
      });
    this.service
      .requests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => (this.requests = rows),
        error: () => (this.error = 'Nao foi possivel carregar solicitacoes S-3000.'),
      });
  }

  open(event: ESocialExcludableEvent): void {
    this.selected = event;
    this.justification = '';
    this.error = '';
  }

  close(): void {
    this.selected = null;
    this.justification = '';
  }

  submit(): void {
    if (!this.selected || this.justification.trim().length < 30) return;
    this.submitting = true;
    this.error = '';
    this.service
      .exclude(this.selected.id, this.justification.trim())
      .pipe(
        finalize(() => (this.submitting = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.close();
          this.load();
        },
        error: () => (this.error = 'Nao foi possivel solicitar a exclusao S-3000.'),
      });
  }
}
