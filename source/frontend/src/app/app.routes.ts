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
    path: 'publico/concursos/:slug/prova-online',
    loadComponent: () =>
      import('./features/portal-publico/concursos/prova-online/prova-online').then(
        (m) => m.PortalPublicoProvaOnline,
      ),
  },
  {
    path: 'publico/banca/verify/:token',
    loadComponent: () =>
      import('./features/portal-publico/banca-verify/banca-verify').then(
        (m) => m.PortalBancaVerify,
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
        path: 'recrutamento/biometria',
        loadComponent: () =>
          import('./features/recrutamento/biometria/biometria').then(
            (m) => m.RecrutamentoBiometria,
          ),
      },
      {
        path: 'recrutamento/prova-online-review',
        loadComponent: () =>
          import('./features/recrutamento/prova-online-review/prova-online-review').then(
            (m) => m.RecrutamentoProvaOnlineReview,
          ),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'recrutamento',
          permissions: ['recrutamento.exam.review'],
          moduleLabel: 'Recrutamento e Seleção',
        },
      },
      {
        path: 'recrutamento/banca',
        loadComponent: () =>
          import('./features/recrutamento/banca/banca').then((m) => m.RecrutamentoBanca),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'recrutamento',
          permissions: ['recrutamento.banca.read'],
          moduleLabel: 'Recrutamento e Seleção',
        },
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
        path: 'portal/comprovante-rendimentos',
        loadComponent: () =>
          import('./features/portal/comprovante-rendimentos/comprovante-rendimentos').then(
            (m) => m.PortalComprovanteRendimentos,
          ),
      },
      {
        path: 'portal/aso',
        loadComponent: () => import('./features/portal/aso/aso').then((m) => m.PortalAso),
      },
      {
        path: 'portal/ponto/banco-horas',
        loadComponent: () =>
          import('./features/portal/ponto/banco-horas/portal-banco-horas').then(
            (m) => m.PortalBancoHoras,
          ),
      },
      {
        path: 'portal/ponto/justificativa',
        loadComponent: () =>
          import('./features/portal/ponto/justificativa/portal-justificativa').then(
            (m) => m.PortalJustificativa,
          ),
      },
      {
        path: 'portal/ponto/espelho',
        loadComponent: () =>
          import('./features/portal/ponto/espelho/portal-espelho-ponto').then(
            (m) => m.PortalEspelhoPonto,
          ),
      },
      {
        path: 'portal/ponto/mobile',
        loadComponent: () =>
          import('./features/portal-empregado/ponto-mobile/ponto-mobile').then(
            (m) => m.PontoMobile,
          ),
      },
      {
        path: 'portal/meus-dados/biometria',
        loadComponent: () =>
          import('./features/portal-empregado/meus-dados/biometria/portal-biometria').then(
            (m) => m.PortalBiometria,
          ),
      },
      {
        path: 'portal/meus-dados/face',
        loadComponent: () =>
          import('./features/portal-empregado/meus-dados/face/portal-face').then(
            (m) => m.PortalFace,
          ),
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
        path: 'ponto/afd',
        loadComponent: () => import('./features/ponto/afd/ponto-afd').then((m) => m.PontoAfd),
      },
      {
        path: 'ponto/escalas',
        loadComponent: () =>
          import('./features/ponto/escalas/ponto-escalas').then((m) => m.PontoEscalas),
      },
      {
        path: 'ponto/banco-horas',
        loadComponent: () =>
          import('./features/ponto/banco-horas/ponto-banco-horas').then((m) => m.PontoBancoHoras),
      },
      {
        path: 'ponto/justificativas',
        loadComponent: () =>
          import('./features/ponto/justificativas/ponto-justificativas').then(
            (m) => m.PontoJustificativas,
          ),
      },
      {
        path: 'ponto/folha',
        loadComponent: () => import('./features/ponto/folha/ponto-folha').then((m) => m.PontoFolha),
      },
      {
        path: 'ponto/biometria',
        loadComponent: () =>
          import('./features/ponto/biometria/ponto-biometria').then((m) => m.PontoBiometria),
      },
      {
        path: 'ponto/face',
        loadComponent: () =>
          import('./features/ponto/face-admin/face-admin').then((m) => m.FaceAdmin),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'ponto',
          permissions: ['ponto.face.read'],
          moduleLabel: 'Ponto',
        },
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
        path: 'fiscal/dirf',
        loadComponent: () => import('./features/fiscal/dirf/dirf').then((m) => m.FiscalDirf),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'fiscal',
          permissions: ['fiscal.dirf.read'],
          moduleLabel: 'Fiscal',
        },
      },
      {
        path: 'fiscal/gps-residual',
        loadComponent: () =>
          import('./features/fiscal/gps-residual/gps-residual').then((m) => m.FiscalGpsResidual),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'fiscal',
          permissions: ['fiscal.gps.read'],
          moduleLabel: 'Fiscal',
        },
      },
      {
        path: 'tce/adapters',
        loadComponent: () =>
          import('./features/tce/adapters/tce-adapters').then((m) => m.TceAdapters),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'tce',
          permissions: ['tce.adapter.read'],
          moduleLabel: 'TCE',
        },
      },
      {
        path: 'tce/catalog',
        loadComponent: () => import('./features/tce/catalog/tce-catalog').then((m) => m.TceCatalog),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'tce',
          permissions: ['tce.catalog.read'],
          moduleLabel: 'TCE',
        },
      },
      {
        path: 'tce/audesp-sp',
        loadComponent: () => import('./features/tce/audesp-sp/audesp-sp').then((m) => m.AudespSp),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'tce',
          permissions: ['tce.submission.read'],
          moduleLabel: 'TCE',
        },
      },
      {
        path: 'tce/queue',
        loadComponent: () => import('./features/tce/queue/tce-queue').then((m) => m.TceQueue),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'tce',
          permissions: ['tce.submission.read'],
          moduleLabel: 'TCE',
        },
      },
      {
        path: 'ponto/geofences',
        loadComponent: () =>
          import('./features/ponto/geofence-admin/geofence-admin').then((m) => m.GeofenceAdmin),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'ponto',
          permissions: ['ponto.mobile.write'],
          moduleLabel: 'Ponto',
        },
      },
      {
        path: 'folha/comprovantes-rendimentos',
        loadComponent: () =>
          import('./features/folha-pagamento/comprovantes-rendimentos/comprovantes-rendimentos').then(
            (m) => m.ComprovantesRendimentos,
          ),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['fiscal.yearly_income.write'],
          moduleLabel: 'Folha de Pgt',
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
      {
        path: 'esocial/retornos',
        loadComponent: () =>
          import('./features/esocial/retornos/esocial-retornos').then((m) => m.ESocialRetornos),
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'esocial',
          permissions: ['esocial.event.read'],
          moduleLabel: 'eSocial',
        },
      },
      ...adminFeatureRoutes,
    ],
  },
  { path: '**', redirectTo: '' },
];
