import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
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
        path: 'gestao',
        loadChildren: () => import('./features/gestao/gestao-module').then((m) => m.GestaoModule),
      },
      {
        path: 'rh',
        loadChildren: () => import('./features/rh/rh-module').then((m) => m.RhModule),
      },
      ...adminFeatureRoutes,
    ],
  },
  { path: '**', redirectTo: '' },
];
