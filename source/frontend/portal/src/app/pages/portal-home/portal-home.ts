import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PORTAL_FEATURE_CATALOG } from '../../core/portal/portal-feature-catalog';

@Component({
  selector: 'sgp-portal-home',
  imports: [RouterLink],
  templateUrl: './portal-home.html',
  styleUrl: './portal-home.scss',
})
export class PortalHome {
  readonly sections = PORTAL_FEATURE_CATALOG;
  readonly totalSections = this.sections.length;
  readonly totalItems = this.sections.reduce((count, section) => count + section.items.length, 0);
}
