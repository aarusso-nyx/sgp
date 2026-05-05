import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PORTAL_FEATURE_CATALOG } from '../../core/portal/portal-feature-catalog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sgp-portal-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './portal-shell.html',
  styleUrl: './portal-shell.scss',
})
export class PortalShell {
  readonly sections = PORTAL_FEATURE_CATALOG;
}
