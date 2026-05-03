import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission-guard';
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
import { RhEmployeeAlimony } from './employees/alimony/alimony';
import { RhReintegracao } from './reintegracao/reintegracao';
import { RhTsvContratos } from './tsv-contratos/tsv-contratos';

export const rhRoutes: Routes = [
  {
    path: 'funcionarios',
    component: RhFuncionarios,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.employee.read'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'funcionarios/:id/vinculos',
    component: RhFuncionariosVinculos,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.employment_link.write'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'funcionarios/:id/historico',
    component: RhFuncionariosHistorico,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.history.read'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'funcionarios/:id/abono-permanencia',
    component: RhAbonoPermanencia,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.employee.abono.write'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'funcionarios/:id/dados-bancarios',
    component: RhEmployeeBankAccounts,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['hr.bank_account.read'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'funcionarios/:id/pensao-alimenticia',
    component: RhEmployeeAlimony,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['hr.alimony.read'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'funcionarios/vinculos',
    component: RhFuncionariosVinculos,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.employment_link.write'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'cadastral-changes',
    component: RhCadastralChanges,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.cadastral_change.approve'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'ferias',
    component: RhFerias,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.vacation.read'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'licencas',
    component: RhLicencas,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.leave.read'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'transferencia/gestao',
    component: RhEmployeeTransfer,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.movimentacao.read'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'reintegracao',
    component: RhReintegracao,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.employee.write'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'portal/transferencias',
    component: RhPortalEmployeeTransfer,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['rh.movimentacao.request'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: 'tsv-contratos',
    component: RhTsvContratos,
    canActivate: [permissionGuard],
    data: {
      moduleKey: 'rh',
      permissions: ['hr.employment.read'],
      moduleLabel: 'Módulo RH',
    },
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'funcionarios',
  },
  ...buildModuleRouteGroup('rh', RhHome, {
    moduleLabel: 'Módulo RH',
  }),
];

@NgModule({
  imports: [RouterModule.forChild(rhRoutes)],
  exports: [RouterModule],
})
export class RhRoutingModule {}
