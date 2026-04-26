import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { FolhaPagamentoHome } from './pages/folha-pagamento-home/folha-pagamento-home';

@NgModule({
  imports: [
    RouterModule.forChild(
      buildModuleRouteGroup('folha', FolhaPagamentoHome, {
        moduleLabel: 'Folha de Pgt',
      }),
    ),
  ],
  exports: [RouterModule],
})
export class FolhaPagamentoRoutingModule {}
