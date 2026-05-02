import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

interface YearlyIncomeFile {
  yearBase: number;
  taxableTotal: string;
  exemptTotal: string;
  irrfTotal: string;
  recomputedAt: string;
}

@Component({
  selector: 'app-portal-comprovante-rendimentos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comprovante-rendimentos.html',
  styleUrl: './comprovante-rendimentos.scss',
})
export class PortalComprovanteRendimentos implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly http = inject(HttpClient);

  files: YearlyIncomeFile[] = [];
  error = '';

  ngOnInit(): void {
    this.http
      .get<YearlyIncomeFile[]>('/api/v1/portal/yearly-income')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (files) => {
          this.files = files;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar os comprovantes.';
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  download(file: YearlyIncomeFile): void {
    window.location.href = `/api/v1/portal/yearly-income/${file.yearBase}/pdf`;
  }

  money(value: string): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }
}
