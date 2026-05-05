import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission-guard';
import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { Contracheques } from './contracheques/contracheques';
import { FolhaMensal } from './competencia/folha-mensal';
import { Consignados } from './consignados/consignados';
import { ConsignadoPortabilidade } from './consignados/portabilidade/portabilidade';
import { Fgts } from './fgts/fgts';
import { FgtsRemessas } from './fgts-remessas/fgts-remessas';
import { PisPasep } from './pis-pasep/pis-pasep';
import { FolhaPagamentoHome } from './pages/folha-pagamento-home/folha-pagamento-home';
import { RescisaoFolha } from './processamentos/rescisao/rescisao';
import { RemessaBancaria } from './remessa/remessa-bancaria';
import { RetornoBancario } from './retorno/retorno-bancario';
import { Rubricas } from './rubricas/rubricas';
import { SimulacaoFolha } from './simulacao/simulacao';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'consignados',
        component: Consignados,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payment.consignment.read'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      {
        path: 'consignados/portabilidade',
        component: ConsignadoPortabilidade,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payment.consignment.write'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      {
        path: 'fgts',
        component: Fgts,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payroll.fgts.read'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      {
        path: 'fgts-remessas',
        component: FgtsRemessas,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payment.remittance.write', 'payroll.fgts.read'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      {
        path: 'pis-pasep',
        component: PisPasep,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payroll.payroll.read'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      {
        path: 'contracheques',
        component: Contracheques,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['report.payslip.write'],
          moduleLabel: 'Folha de Pgt',
        },
      },
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
        path: 'processamentos/rescisao',
        component: RescisaoFolha,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payroll.run.execute', 'rh.employee.terminate'],
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
        path: 'remessa-bancaria/gestao',
        component: RemessaBancaria,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payment.remittance.read'],
          moduleLabel: 'Folha de Pgt',
        },
      },
      {
        path: 'retorno-bancario/gestao',
        component: RetornoBancario,
        canActivate: [permissionGuard],
        data: {
          moduleKey: 'folha',
          permissions: ['payment.return.write'],
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
