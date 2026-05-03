import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ESocialClosureState, ESocialFechamentoService } from './esocial-fechamento.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-fechamento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './esocial-fechamento.html',
  styleUrl: './esocial-fechamento.scss',
})
export class ESocialFechamento implements OnInit, OnDestroy {
  private readonly service = inject(ESocialFechamentoService);
  private readonly destroy$ = new Subject<void>();
  year = 2026;
  month = 1;
  state: ESocialClosureState | null = null;
  loading = false;
  closing = false;
  error = '';
  lastHash = '';

  ngOnInit(): void {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth() + 1;
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canClose(): boolean {
    return Boolean(this.state && this.state.pending.length === 0 && !this.closing);
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service
      .status(this.year, this.month)
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (state) => (this.state = state),
        error: () => (this.error = 'Nao foi possivel carregar o fechamento.'),
      });
  }

  close(): void {
    if (!this.canClose) return;
    this.closing = true;
    this.error = '';
    this.service
      .close(this.year, this.month)
      .pipe(
        finalize(() => (this.closing = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.lastHash = result.xmlHash;
          this.state = result.state;
        },
        error: () => (this.error = 'Nao foi possivel fechar a competencia.'),
      });
  }
}
