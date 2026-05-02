import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { RelatorioHome } from './pages/relatorio-home/relatorio-home';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('relatorios', RelatorioHome, {
        moduleLabel: 'Relatório',
      }),
    ),
  ],
  exports: [RouterModule],
})
export class RelatorioRoutingModule {}
