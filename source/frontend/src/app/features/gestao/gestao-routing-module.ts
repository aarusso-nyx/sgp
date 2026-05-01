import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { GestaoMasterData } from './master-data/master-data';
import { GestaoHome } from './pages/gestao-home/gestao-home';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('gestao', GestaoHome, {
        moduleLabel: 'Gestão',
      }).map((route) =>
        route.path === ''
          ? { ...route, component: GestaoMasterData }
          : route,
      ),
    ),
  ],
  exports: [RouterModule],
})
export class GestaoRoutingModule {}
