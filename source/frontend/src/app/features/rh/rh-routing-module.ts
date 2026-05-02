import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { buildModuleRouteGroup } from '../../core/navigation/module-route-groups';
import { RhCadastralChanges } from './cadastral-changes/cadastral-changes';
import { RhFerias } from './ferias/ferias';
import { RhFuncionarios } from './funcionarios/funcionarios';
import { RhAbonoPermanencia } from './funcionarios/abono-permanencia/abono-permanencia';
import { RhFuncionariosHistorico } from './funcionarios/historico/historico';
import { RhFuncionariosVinculos } from './funcionarios/vinculos/vinculos';
import { RhHome } from './pages/rh-home/rh-home';
import { RhLicencas } from './licencas/licencas';
import { RhEmployeeTransfer } from './employee-transfer/employee-transfer';
import { RhPortalEmployeeTransfer } from './portal-employee-transfer/portal-employee-transfer';
import { RhEmployeeBankAccounts } from './employees/bank-accounts/bank-accounts';

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
        path: 'funcionarios/:id/abono-permanencia',
        component: RhAbonoPermanencia,
      },
      {
        path: 'funcionarios/:id/dados-bancarios',
        component: RhEmployeeBankAccounts,
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
        path: 'licencas',
        component: RhLicencas,
      },
      {
        path: 'transferencia/gestao',
        component: RhEmployeeTransfer,
      },
      {
        path: 'portal/transferencias',
        component: RhPortalEmployeeTransfer,
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
