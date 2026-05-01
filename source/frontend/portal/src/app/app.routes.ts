import { Routes } from '@angular/router';

import { PORTAL_FEATURE_CATALOG } from './core/portal/portal-feature-catalog';
import { Ferias } from './pages/ferias/ferias';
import { LicencasSaude } from './pages/licencas/saude/saude';
import { MeusDados } from './pages/meus-dados/meus-dados';
import { PortalFeaturePage } from './pages/portal-feature-page/portal-feature-page';
import { PortalHome } from './pages/portal-home/portal-home';
import { PortalShell } from './pages/portal-shell/portal-shell';

function normalizePath(path: string): string {
  return path.replace(/^\//, '');
}

const featureRoutes: Routes = PORTAL_FEATURE_CATALOG.flatMap((section) =>
  section.items.map((item) => ({
    path: normalizePath(item.path),
    component: PortalFeaturePage,
    data: {
      item,
      sectionLabel: section.label,
      sectionSummary: section.summary,
    },
  })),
);

export const routes: Routes = [
  {
    path: '',
    component: PortalShell,
    children: [
      {
        path: '',
        component: PortalHome,
      },
      {
        path: 'meus-dados/:section',
        component: MeusDados,
      },
      {
        path: 'ferias/:section',
        component: Ferias,
      },
      {
        path: 'licencas/saude/:section',
        component: LicencasSaude,
      },
      ...featureRoutes,
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
