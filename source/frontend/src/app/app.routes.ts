import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { permissionGuard } from './core/auth/permission-guard';
import { ADMIN_MODULES } from './core/navigation/admin-feature-catalog';
import { buildModuleRouteGroup } from './core/navigation/module-route-groups';
import type { LegacyModuleKey } from './core/navigation/legacy-navigation.types';
import { AdminFeaturePage } from './features/admin-feature/pages/admin-feature-page/admin-feature-page';
import { AuthCallback } from './features/security/pages/auth-callback/auth-callback';
import { Forbidden } from './features/security/pages/forbidden/forbidden';
import { Shell } from './shared-platform/shell/shell';

const adminFeatureRoutes = ADMIN_MODULES.filter(
  (module) => module.key !== 'gestao' && module.key !== 'rh',
).map((module) => ({
  path: module.routePath.replace(/^\//, ''),
  children: buildModuleRouteGroup(module.key as LegacyModuleKey, AdminFeaturePage, {
    moduleLabel: module.label,
  }),
}));

export const routes: Routes = [
  {
    path: 'transparencia',
    loadComponent: () =>
      import('./features/publico/transparencia/transparencia').then((m) => m.PublicoTransparencia),
  },
  {
    path: 'transparencia/concursos',
    loadComponent: () =>
      import('./features/portal-transparencia/concursos/concursos').then(
        (m) => m.PortalTransparenciaConcursos,
      ),
  },
  {
    path: 'publico/concursos/:slug/inscricao',
    loadComponent: () =>
      import('./features/portal-publico/concursos/inscricao/inscricao').then(
        (m) => m.PortalPublicoInscricao,
      ),
  },
  {
    path: 'publico/concursos/minhas-notas',
    loadComponent: () =>
      import('./features/portal-publico/concursos/minhas-notas/minhas-notas').then(
        (m) => m.PortalPublicoMinhasNotas,
      ),
  },
  {
    path: 'publico/concursos/minhas-nomeacoes',
    loadComponent: () =>
      import('./features/portal-publico/concursos/minhas-nomeacoes/minhas-nomeacoes').then(
        (m) => m.PortalPublicoMinhasNomeacoes,
      ),
  },
  {
    path: 'publico/concursos/:slug/classificacao',
    loadComponent: () =>
      import('./features/portal-publico/concursos/classificacao/classificacao').then(
        (m) => m.PortalPublicoClassificacao,
      ),
  },
  {
    path: 'auth/callback',
    component: AuthCallback,
  },
  {
    path: 'forbidden',
    component: Forbidden,
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'gestao' },
      { path: 'folha-pagamento', pathMatch: 'full', redirectTo: 'folha' },
      { path: 'relatorio', pathMatch: 'full', redirectTo: 'relatorios' },
      {
        path: 'folha',
        loadChildren: () =>
          import('./features/folha-pagamento/folha-pagamento-module').then(
            (m) => m.FolhaPagamentoModule,
          ),
      },
      {
        path: 'gestao',
        loadChildren: () => import('./features/gestao/gestao-module').then((m) => m.GestaoModule),
      },
      {
        path: 'rh',
        loadChildren: () => import('./features/rh/rh-module').then((m) => m.RhModule),
      },
      {
        path: 'recrutamento/concursos',
        loadComponent: () =>
          import('./features/recrutamento/concursos/concursos').then(
            (m) => m.RecrutamentoConcursos,
          ),
      },
      {
        path: 'recrutamento/avaliacao',
        loadComponent: () =>
          import('./features/recrutamento/avaliacao/avaliacao').then(
            (m) => m.RecrutamentoAvaliacao,
          ),
      },
      {
        path: 'recrutamento/classificacao',
        loadComponent: () =>
          import('./features/recrutamento/classificacao/classificacao').then(
            (m) => m.RecrutamentoClassificacao,
          ),
      },
      {
        path: 'recrutamento/nomeacao',
        loadComponent: () =>
          import('./features/recrutamento/nomeacao/nomeacao').then((m) => m.RecrutamentoNomeacao),
      },
      {
        path: 'recrutamento/posse',
        loadComponent: () =>
          import('./features/recrutamento/posse/posse').then((m) => m.RecrutamentoPosse),
      },
      {
        path: 'avaliacao/estagio-probatorio',
        loadComponent: () =>
          import('./features/avaliacao/estagio-probatorio/estagio-probatorio').then(
            (m) => m.AvaliacaoEstagioProbatorio,
          ),
      },
      {
        path: 'avaliacao/pccs',
        loadComponent: () => import('./features/avaliacao/pccs/pccs').then((m) => m.AvaliacaoPccs),
      },
      {
        path: 'avaliacao/progressoes',
        loadComponent: () =>
          import('./features/avaliacao/progressoes/progressoes').then(
            (m) => m.AvaliacaoProgressoes,
          ),
      },
      {
        path: 'portal/meus-dados/consignados',
        loadComponent: () =>
          import('./features/portal/meus-dados/consignados/portal-consignados').then(
            (m) => m.PortalConsignados,
          ),
      },
      {
        path: 'portal/minha-carreira',
        loadComponent: () =>
          import('./features/portal/minha-carreira/minha-carreira').then(
            (m) => m.PortalMinhaCarreira,
          ),
      },
      {
        path: 'portal/contracheque',
        loadComponent: () =>
          import('./features/portal/contracheque/contracheque').then((m) => m.PortalContracheque),
      },
      {
        path: 'portal/aso',
        loadComponent: () => import('./features/portal/aso/aso').then((m) => m.PortalAso),
      },
      {
        path: 'saude/exames',
        loadComponent: () => import('./features/saude/exames/exames').then((m) => m.SaudeExames),
      },
      {
        path: 'saude/aso',
        loadComponent: () => import('./features/saude/aso/aso').then((m) => m.SaudeAso),
      },
      {
        path: 'saude/acidentes',
        loadComponent: () =>
          import('./features/saude/acidentes/acidentes').then((m) => m.SaudeAcidentes),
      },
      {
        path: 'saude/pcmso',
        loadComponent: () => import('./features/saude/pcmso/pcmso').then((m) => m.SaudePcmso),
      },
      {
        path: 'saude/pgr',
        loadComponent: () => import('./features/saude/pgr/pgr').then((m) => m.SaudePgr),
      },
      {
        path: 'saude/exposicoes',
        loadComponent: () =>
          import('./features/saude/exposicoes/exposicoes').then((m) => m.SaudeExposicoes),
      },
      {
        path: 'saude/epi',
        loadComponent: () => import('./features/saude/epi/epi').then((m) => m.SaudeEpi),
      },
      {
        path: 'saude/ppp',
        loadComponent: () => import('./features/saude/ppp/ppp').then((m) => m.SaudePpp),
      },
      {
        path: 'saude/pericia',
        loadComponent: () => import('./features/saude/pericia/pericia').then((m) => m.SaudePericia),
      },
      {
        path: 'ponto/jornadas',
        loadComponent: () =>
          import('./features/ponto/jornadas/ponto-jornadas').then((m) => m.PontoJornadas),
      },
      {
        path: 'ponto/rep',
        loadComponent: () => import('./features/ponto/rep/ponto-rep').then((m) => m.PontoRep),
      },
      {
        path: 'fiscal/dctfweb',
        loadComponent: () =>
          import('./features/fiscal/dctfweb/dctfweb').then((m) => m.FiscalDctfweb),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'fiscal',
          permissions: ['fiscal.dctfweb.read'],
          moduleLabel: 'Fiscal',
        },
      },
      {
        path: 'esocial/tabelas',
        loadComponent: () =>
          import('./features/esocial/tabelas/esocial-tabelas').then((m) => m.ESocialTabelas),
      },
      {
        path: 'esocial/trabalhadores',
        loadComponent: () =>
          import('./features/esocial/trabalhadores/esocial-trabalhadores').then(
            (m) => m.ESocialTrabalhadores,
          ),
      },
      {
        path: 'esocial/folha-periodica',
        loadComponent: () =>
          import('./features/esocial/folha-periodica/esocial-folha-periodica').then(
            (m) => m.ESocialFolhaPeriodica,
          ),
      },
      {
        path: 'esocial/fechamento',
        loadComponent: () =>
          import('./features/esocial/fechamento/esocial-fechamento').then(
            (m) => m.ESocialFechamento,
          ),
      },
      {
        path: 'esocial/exclusao',
        loadComponent: () =>
          import('./features/esocial/exclusao/esocial-exclusao').then((m) => m.ESocialExclusao),
      },
      {
        path: 'esocial/submissao',
        loadComponent: () =>
          import('./features/esocial/submissao/esocial-submissao').then((m) => m.ESocialSubmissao),
      },
      ...adminFeatureRoutes,
    ],
  },
  { path: '**', redirectTo: '' },
];
