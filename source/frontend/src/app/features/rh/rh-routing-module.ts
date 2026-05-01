import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { RhCadastralChanges } from './cadastral-changes/cadastral-changes';
import { RhFerias } from './ferias/ferias';
import { RhFuncionarios } from './funcionarios/funcionarios';
import { RhFuncionariosHistorico } from './funcionarios/historico/historico';
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
        path: 'funcionarios/:id/historico',
        component: RhFuncionariosHistorico,
      },
      {
        path: 'funcionarios/vinculos',
        component: RhFuncionariosVinculos,
      },
      {
        path: 'cadastral-changes',
        component: RhCadastralChanges,
      },
      {
        path: 'ferias',
        component: RhFerias,
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
