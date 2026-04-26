import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { GestaoHome } from './pages/gestao-home/gestao-home';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('gestao', GestaoHome, {
        moduleLabel: 'Gestão',
      }),
    ),
  ],
  exports: [RouterModule],
})
export class GestaoRoutingModule {}
