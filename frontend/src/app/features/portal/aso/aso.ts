import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface PortalAsoRecord {
  id: string;
  asoKind: string;
  scheduledAt: string;
  performedAt: string | null;
  conclusion: string | null;
  nextExamDueAt: string | null;
  status: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-aso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aso.html',
  styleUrl: './aso.scss',
})
export class PortalAso {
  private readonly api = inject(ApiClient);

  records: PortalAsoRecord[] = [];

  async load(): Promise<void> {
    this.records = await firstValueFrom(this.api.get<PortalAsoRecord[]>('v1/portal/aso'));
  }
}
