import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';
import { OpenApiClient } from '../../core/api/generated/openapi-client';
import { PortalFeatureItem } from '../../core/portal/portal-feature-catalog';
import {
  PortalRouteEndpoint,
  portalEndpointForPath,
} from '../../core/portal/portal-route-endpoints';

@Component({
  selector: 'sgp-portal-feature-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './portal-feature-page.html',
  styleUrl: './portal-feature-page.scss',
})
export class PortalFeaturePage implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly openApi = inject(OpenApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  endpoint: PortalRouteEndpoint = portalEndpointForPath('/');
  response: unknown = null;
  rows: Array<{ key: string; value: string }> = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get item(): PortalFeatureItem {
    return this.route.snapshot.data['item'] as PortalFeatureItem;
  }

  get sectionLabel(): string {
    return this.route.snapshot.data['sectionLabel'] as string;
  }

  get sectionSummary(): string {
    return this.route.snapshot.data['sectionSummary'] as string;
  }

  load(): void {
    this.endpoint = portalEndpointForPath(this.item.path);
    this.loading = true;
    this.error = '';
    this.response = null;
    this.rows = [];

    this.endpoint
      .load({ api: this.api, openApi: this.openApi })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.response = response;
          this.rows = summarizeResponse(response);
        },
        error: () => {
          this.error = 'Nao foi possivel carregar os dados desta rota.';
        },
      });
  }
}

function summarizeResponse(response: unknown): Array<{ key: string; value: string }> {
  if (Array.isArray(response)) {
    return [
      { key: 'items', value: String(response.length) },
      ...response.slice(0, 4).map((item, index) => ({
        key: `item ${index + 1}`,
        value: stringifySummary(item),
      })),
    ];
  }

  if (response && typeof response === 'object') {
    return Object.entries(response as Record<string, unknown>)
      .slice(0, 8)
      .map(([key, value]) => ({ key, value: stringifySummary(value) }));
  }

  return [{ key: 'response', value: stringifySummary(response) }];
}

function stringifySummary(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
