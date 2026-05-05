import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiClient } from '../../core/api/api-client';
import { PORTAL_FEATURE_CATALOG } from '../../core/portal/portal-feature-catalog';

interface MyJobCard {
  cargo: string | null;
  codigoCargo: string | null;
  classe: number | null;
  nivel: number | null;
  vencimentoBasico: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sgp-portal-home',
  imports: [RouterLink],
  templateUrl: './portal-home.html',
  styleUrl: './portal-home.scss',
})
export class PortalHome {
  readonly sections = PORTAL_FEATURE_CATALOG;
  readonly totalSections = this.sections.length;
  readonly totalItems = this.sections.reduce((count, section) => count + section.items.length, 0);
  myJob?: MyJobCard;

  constructor(
    private readonly api: ApiClient,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.api.get<MyJobCard>('/v1/portal/meus-dados/cargo').subscribe({
      next: (job) => {
        this.myJob = job;
        this.cdr.markForCheck();
      },
      error: () => {
        this.myJob = undefined;
        this.cdr.markForCheck();
      },
    });
  }
}
