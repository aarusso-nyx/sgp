import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { AdminFeaturePage } from '../admin-feature/pages/admin-feature-page/admin-feature-page';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('convenio', AdminFeaturePage, {
        moduleLabel: 'Convênio',
      }),
    ),
  ],
  exports: [RouterModule],
})
export class ConvenioRoutingModule {}
