import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface YearlyIncomeFile {
  yearBase: number;
  taxableTotal: string;
  exemptTotal: string;
  irrfTotal: string;
  recomputedAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-comprovante-rendimentos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comprovante-rendimentos.html',
  styleUrl: './comprovante-rendimentos.scss',
})
export class PortalComprovanteRendimentos implements OnInit {
  private readonly api = inject(ApiClient);

  files: YearlyIncomeFile[] = [];
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.files = await firstValueFrom(
        this.api.get<YearlyIncomeFile[]>('/api/v1/portal/yearly-income'),
      );
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m147;
    }
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
