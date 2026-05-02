import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

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
  selector: 'app-portal-aso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aso.html',
  styleUrl: './aso.scss',
})
export class PortalAso implements OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly destroy$ = new Subject<void>();

  records: PortalAsoRecord[] = [];

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api
      .get<PortalAsoRecord[]>('v1/portal/aso')
      .pipe(takeUntil(this.destroy$))
      .subscribe((records) => {
        this.records = records;
      });
  }
}
