import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

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
export class LgpdEncarregado implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly destroy$ = new Subject<void>();

  info?: LgpdDpoInfo;
  loading = false;
  error = '';

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
    this.api
      .get<LgpdDpoInfo>('v1/public/lgpd/encarregado')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => {
          this.info = info;
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o contato do encarregado.';
          this.loading = false;
        },
      });
  }
}
