import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission-guard';
import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { FolhaPagamentoHome } from './pages/folha-pagamento-home/folha-pagamento-home';
import { Rubricas } from './rubricas/rubricas';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'verba/gestao',
        component: Rubricas,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['folha.rubrica.read'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      {
        path: 'cargo-rubrica/gestao',
        component: Rubricas,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['folha.rubrica.read'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      ...buildModuleRouteGroup('folha', FolhaPagamentoHome, {
        moduleLabel: 'Folha de Pgt',
      }),
    ]),
  ],
  exports: [RouterModule],
})
export class FolhaPagamentoRoutingModule {}
