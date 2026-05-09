import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface LgpdDpoContact {
  email: string;
  phone: string;
  channelUrl: string;
  officeHours: string;
  postalAddress: string;
}

interface LgpdDpoInfo {
  name: string;
  contact: LgpdDpoContact;
  updatedAt: string | null;
}

interface LgpdInternationalTransfer {
  flowKey: string;
  processorName: string;
  destinationCountry: string;
  destinationCountryName: string | null;
  mechanism: string;
  mechanismReference: string;
  adequacyDecisionRef: string | null;
  startsAt: string | null;
  reviewDueAt: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-lgpd-encarregado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lgpd-encarregado.html',
  styleUrl: './lgpd-encarregado.scss',
})
export class LgpdEncarregado implements OnInit {
  private readonly api = inject(ApiClient);

  info?: LgpdDpoInfo;
  transfers: LgpdInternationalTransfer[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const [info, transfers] = await Promise.all([
        firstValueFrom(this.api.get<LgpdDpoInfo>('v1/public/lgpd/encarregado')),
        firstValueFrom(
          this.api.get<{ items: LgpdInternationalTransfer[] }>(
            'v1/public/lgpd/transferencias-internacionais',
          ),
        ),
      ]);
      this.info = info;
      this.transfers = transfers.items;
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m149;
    } finally {
      this.loading = false;
    }
  }
}
