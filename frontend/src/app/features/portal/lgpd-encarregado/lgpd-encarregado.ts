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
  loading = false;
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.info = await firstValueFrom(this.api.get<LgpdDpoInfo>('v1/public/lgpd/encarregado'));
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m149;
    } finally {
      this.loading = false;
    }
  }
}
