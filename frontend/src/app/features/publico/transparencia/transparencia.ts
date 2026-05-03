import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import {
  TransparenciaService,
  TransparencyFilters,
  TransparencyPayrollRow,
} from './transparencia.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-publico-transparencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transparencia.html',
  styleUrl: './transparencia.scss',
})
export class PublicoTransparencia implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  filters: TransparencyFilters = {
    tenantId: '00000000-0000-4000-8000-000000000001',
    page: 1,
    pageSize: 20,
  };
  rows: TransparencyPayrollRow[] = [];
  total = 0;
  totalPages = 0;
  loading = false;
  error = '';
  csvUrl = '';

  constructor(private readonly transparencia: TransparenciaService) {}

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
    this.transparencia
      .list(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.rows = result.items;
          this.total = result.total;
          this.totalPages = result.totalPages;
          this.csvUrl = this.transparencia.csvUrl(this.filters);
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar a transparencia remuneratoria.';
          this.loading = false;
        },
      });
  }

  submit(): void {
    this.filters.page = 1;
    this.load();
  }

  nextPage(): void {
    if ((this.filters.page ?? 1) >= this.totalPages || (this.filters.page ?? 1) >= 50) return;
    this.filters.page = (this.filters.page ?? 1) + 1;
    this.load();
  }

  previousPage(): void {
    if ((this.filters.page ?? 1) <= 1) return;
    this.filters.page = (this.filters.page ?? 1) - 1;
    this.load();
  }
}
