import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { RhFuncionarios } from './funcionarios/funcionarios';
import { RhFuncionariosVinculos } from './funcionarios/vinculos/vinculos';
import { RhHome } from './pages/rh-home/rh-home';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'funcionarios',
        component: RhFuncionarios,
      },
      {
        path: 'funcionarios/:id/vinculos',
        component: RhFuncionariosVinculos,
      },
      {
        path: 'funcionarios/vinculos',
        component: RhFuncionariosVinculos,
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'funcionarios',
      },
      ...buildModuleRouteGroup('rh', RhHome, {
        moduleLabel: 'Módulo RH',
      }),
    ]),
  ],
  exports: [RouterModule],
})
export class RhRoutingModule {}
