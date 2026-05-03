import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

interface PortalPayslipFile {
  id: string;
  competence: string;
  fileHash: string;
  generatedAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-contracheque',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contracheque.html',
  styleUrl: './contracheque.scss',
})
export class PortalContracheque implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly api = inject(ApiClient);

  payslips: PortalPayslipFile[] = [];
  error = '';

  ngOnInit(): void {
    this.api
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
