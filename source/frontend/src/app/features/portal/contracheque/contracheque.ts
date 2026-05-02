import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

interface PortalPayslipFile {
  id: string;
  competence: string;
  fileHash: string;
  generatedAt: string;
}

@Component({
  selector: 'app-portal-contracheque',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contracheque.html',
  styleUrl: './contracheque.scss',
})
export class PortalContracheque implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly http = inject(HttpClient);

  payslips: PortalPayslipFile[] = [];
  error = '';

  ngOnInit(): void {
    this.http
      .get<PortalPayslipFile[]>('/api/v1/portal/payslips')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payslips) => {
          this.payslips = payslips;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar os contracheques.';
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  download(payslip: PortalPayslipFile): void {
    window.location.href = `/api/v1/portal/payslips/${payslip.id}/pdf`;
  }
}
