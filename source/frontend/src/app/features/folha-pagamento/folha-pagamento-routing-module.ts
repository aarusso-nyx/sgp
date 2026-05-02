import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission-guard';
import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { FolhaMensal } from './competencia/folha-mensal';
import { FolhaPagamentoHome } from './pages/folha-pagamento-home/folha-pagamento-home';
import { Rubricas } from './rubricas/rubricas';
import { SimulacaoFolha } from './simulacao/simulacao';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'competencia/mensal',
        component: FolhaMensal,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payroll.run.execute'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      {
        path: 'simulacao',
        component: SimulacaoFolha,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payroll.simulation.execute'],
          moduleLabel: 'Folha de Pgt',
        },
      },
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
