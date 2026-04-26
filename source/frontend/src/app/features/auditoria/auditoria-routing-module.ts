import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { AuditoriaHome } from './pages/auditoria-home/auditoria-home';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('auditoria', AuditoriaHome, {
        moduleLabel: 'Auditoria',
      }),
    ),
  ],
  exports: [RouterModule],
})
export class AuditoriaRoutingModule {}
