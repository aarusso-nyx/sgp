import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PortalFeatureItem } from '../../core/portal/portal-feature-catalog';

@Component({
  selector: 'sgp-portal-feature-page',
  imports: [RouterLink],
  templateUrl: './portal-feature-page.html',
  styleUrl: './portal-feature-page.scss',
})
export class PortalFeaturePage {
  private readonly route = inject(ActivatedRoute);

  get item(): PortalFeatureItem {
    return this.route.snapshot.data['item'] as PortalFeatureItem;
  }

  get sectionLabel(): string {
    return this.route.snapshot.data['sectionLabel'] as string;
  }

  get sectionSummary(): string {
    return this.route.snapshot.data['sectionSummary'] as string;
  }
}
