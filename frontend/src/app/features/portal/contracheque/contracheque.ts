import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
export class PortalContracheque implements OnInit {
  private readonly api = inject(ApiClient);

  payslips: PortalPayslipFile[] = [];
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.payslips = await firstValueFrom(
        this.api.get<PortalPayslipFile[]>('/api/v1/portal/payslips'),
      );
    } catch {
      this.error = 'Nao foi possivel carregar os contracheques.';
    }
  }

  download(payslip: PortalPayslipFile): void {
    window.location.href = `/api/v1/portal/payslips/${payslip.id}/pdf`;
  }
}
