import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { TaxRateIrrf } from '../admin/parametros/tax-rate-irrf/tax-rate-irrf';
import { Cargos } from './cargos/cargos';
import { GestaoMasterData } from './master-data/master-data';
import { GestaoHome } from './pages/gestao-home/gestao-home';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('gestao', GestaoHome, {
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
        return route;
      }),
    ),
  ],
  exports: [RouterModule],
})
export class GestaoRoutingModule {}
