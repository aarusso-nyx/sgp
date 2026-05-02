import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { ConvenioHome } from './pages/convenio-home/convenio-home';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('convenio', ConvenioHome, {
        moduleLabel: 'Convênio',
      }),
    ),
  ],
  exports: [RouterModule],
})
export class ConvenioRoutingModule {}
