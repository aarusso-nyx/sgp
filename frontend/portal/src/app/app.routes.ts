import { Routes } from '@angular/router';

import { PORTAL_FEATURE_CATALOG } from './core/portal/portal-feature-catalog';
import { Contracheque } from './pages/contracheque/contracheque';
import { Ferias } from './pages/ferias/ferias';
import { Licencas } from './pages/licencas/licencas';
import { LicencasSaude } from './pages/licencas/saude/saude';
import { MeusDados } from './pages/meus-dados/meus-dados';
import { MeusDadosBancarios } from './pages/meus-dados/bancarios/bancarios';
import { PortalFeaturePage } from './pages/portal-feature-page/portal-feature-page';
import { PortalHome } from './pages/portal-home/portal-home';
import { PortalShell } from './pages/portal-shell/portal-shell';
import { ProximasEscalas } from './pages/ponto/proximas-escalas/proximas-escalas';

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
        path: 'contracheque',
        component: Contracheque,
      },
      {
        path: 'contracheque/:competence',
        component: Contracheque,
      },
      {
        path: 'contracheques/:section',
        component: Contracheque,
      },
      {
        path: 'contracheques/:section/:detail',
        component: Contracheque,
      },
      {
        path: 'meus-dados/bancarios',
        component: MeusDadosBancarios,
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
      {
        path: 'licencas/:section',
        component: Licencas,
      },
      {
        path: 'ponto/proximas-escalas',
        component: ProximasEscalas,
      },
      ...featureRoutes,
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
