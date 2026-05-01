import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { permissionGuard } from '../../core/auth/permission-guard';
import { TaxRateIrrf } from '../admin/parametros/tax-rate-irrf/tax-rate-irrf';
import { TaxRateRpps } from '../admin/parametros/tax-rate-rpps/tax-rate-rpps';
import { TetoRemuneratorio } from '../admin/parametros/teto-remuneratorio/teto-remuneratorio';
import { AtsParametros } from '../admin/parametros/ats/ats-parametros';
import { Cargos } from './cargos/cargos';
import { GestaoMasterData } from './master-data/master-data';
import { GestaoHome } from './pages/gestao-home/gestao-home';

const gestaoRoutes = buildModuleRouteGroup('gestao', GestaoHome, {
  moduleLabel: 'Gestão',
}).map((route) => {
  if (route.path === '') {
    return { ...route, component: GestaoMasterData };
  }
  if (route.path === 'cargo/gestao' || route.path === 'cargos') {
    return { ...route, component: Cargos };
  }
  if (route.path === 'parametros/irrf') {
    return { ...route, component: TaxRateIrrf };
  }
  if (route.path === 'parametros/rpps') {
    return { ...route, component: TaxRateRpps };
  }
  if (route.path === 'parametros/teto-remuneratorio') {
    return { ...route, component: TetoRemuneratorio };
  }
  if (route.path === 'parametros/ats') {
    return { ...route, component: AtsParametros };
  }
  return route;
});

const wildcardRoute = gestaoRoutes.pop();
gestaoRoutes.push(
  {
    path: 'parametros/irrf',
    component: TaxRateIrrf,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'gestao',
      permissions: ['system.tax-rate.read'],
      moduleLabel: 'Gestão',
    },
  },
  {
    path: 'parametros/rpps',
    component: TaxRateRpps,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'gestao',
      permissions: ['system.tax-rate.read'],
      moduleLabel: 'Gestão',
    },
  },
  {
    path: 'parametros/teto-remuneratorio',
    component: TetoRemuneratorio,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'gestao',
      permissions: ['system.parameter.read'],
      moduleLabel: 'Gestão',
    },
  },
  {
    path: 'parametros/ats',
    component: AtsParametros,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'gestao',
      permissions: ['system.parameter.read'],
      moduleLabel: 'Gestão',
    },
  },
);
if (wildcardRoute) {
  gestaoRoutes.push(wildcardRoute);
}

@NgModule({
  imports: [RouterModule.forChild(gestaoRoutes)],
  exports: [RouterModule],
})
export class GestaoRoutingModule {}
