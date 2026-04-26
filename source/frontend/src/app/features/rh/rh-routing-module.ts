import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { RhHome } from './pages/rh-home/rh-home';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('rh', RhHome, {
        moduleLabel: 'Módulo RH',
      }),
    ),
  ],
  exports: [RouterModule],
})
export class RhRoutingModule {}
