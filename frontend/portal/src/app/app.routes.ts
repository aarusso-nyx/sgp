import { Route, Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { PORTAL_FEATURE_CATALOG } from './core/portal/portal-feature-catalog';
import { PortalAuthCallback } from './pages/auth-callback/auth-callback';
import { Certificacoes } from './pages/certificacoes/certificacoes';
import { Contracheque } from './pages/contracheque/contracheque';
import { Documentos } from './pages/documentos/documentos';
import { Ferias } from './pages/ferias/ferias';
import { Pdi } from './pages/pdi/pdi';
import { GovBrSignCallback } from './pages/govbr-sign-callback/govbr-sign-callback';
import { Licencas } from './pages/licencas/licencas';
import { LicencasSaude } from './pages/licencas/saude/saude';
import { MinhaEquipe } from './pages/minha-equipe/minha-equipe';
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

function withAuthGuard(route: Route): Route {
  const children = route.children?.map(withAuthGuard);
  return {
    ...route,
    canActivate: [authGuard, ...(route.canActivate ?? [])],
    ...(children ? { children } : {}),
  };
}

const portalRoutes: Routes = [
  {
    path: '',
    component: PortalShell,
    children: [
      {
        path: '',
        component: PortalHome,
      },
      {
        path: 'govbr-sign/callback',
        component: GovBrSignCallback,
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
        path: 'documentos/:section',
        component: Documentos,
      },
      {
        path: 'minha-equipe',
        component: MinhaEquipe,
      },
      {
        path: 'aprovacoes',
        component: MinhaEquipe,
      },
      {
        path: 'ponto/proximas-escalas',
        component: ProximasEscalas,
      },
      {
        path: 'certificacoes',
        component: Certificacoes,
      },
      {
        path: 'pdi',
        component: Pdi,
      },
      ...featureRoutes,
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

export const routes: Routes = [
  {
    path: 'auth/callback',
    component: PortalAuthCallback,
  },
  ...portalRoutes.map(withAuthGuard),
];
