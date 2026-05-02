import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  ESocialTrabalhadoresService,
  ESocialWorkerDispatchResult,
  ESocialWorkerStatus,
} from './esocial-trabalhadores.service';

@Component({
  selector: 'app-esocial-trabalhadores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esocial-trabalhadores.html',
  styleUrl: './esocial-trabalhadores.scss',
})
export class ESocialTrabalhadores implements OnInit, OnDestroy {
  private readonly service = inject(ESocialTrabalhadoresService);
  private readonly destroy$ = new Subject<void>();
  rows: ESocialWorkerStatus[] = [];
  lastResult: ESocialWorkerDispatchResult | null = null;
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
        next: (rows) => (this.rows = rows),
        error: () => (this.error = 'Nao foi possivel carregar o cadastro eSocial.'),
      });
  }

  reemitS2200(row: ESocialWorkerStatus): void {
    this.emitting = row.employeeId;
    this.error = '';
    this.service
      .reemitS2200(row.employeeId)
      .pipe(
        finalize(() => (this.emitting = '')),
        takeUntil(this.destroy$),
      )
      .subscribe(this.resultObserver());
  }

  emitS2205(row: ESocialWorkerStatus): void {
    this.emitting = row.employeeId;
    this.error = '';
    this.service
      .emitS2205(row.employeeId)
      .pipe(
        finalize(() => (this.emitting = '')),
        takeUntil(this.destroy$),
      )
      .subscribe(this.resultObserver());
  }

  private resultObserver() {
    return {
      next: (result: ESocialWorkerDispatchResult) => {
        this.lastResult = result;
        this.load();
      },
      error: () => (this.error = 'Nao foi possivel emitir o evento eSocial.'),
    };
  }
}
