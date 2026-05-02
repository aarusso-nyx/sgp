import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { SharedPlatformModule } from '../shared-platform/shared-platform-module';
import { RhCadastralChanges } from './cadastral-changes/cadastral-changes';
import { RhFerias } from './ferias/ferias';
import { RhFuncionarios } from './funcionarios/funcionarios';
import { RhAbonoPermanencia } from './funcionarios/abono-permanencia/abono-permanencia';
import { RhFuncionariosHistorico } from './funcionarios/historico/historico';
import { RhFuncionariosVinculos } from './funcionarios/vinculos/vinculos';
import { RhRoutingModule } from './rh-routing-module';
import { RhHome } from './pages/rh-home/rh-home';
import { RhLicencas } from './licencas/licencas';
import { RhEmployeeTransfer } from './employee-transfer/employee-transfer';
import { RhPortalEmployeeTransfer } from './portal-employee-transfer/portal-employee-transfer';
import { RhEmployeeBankAccounts } from './employees/bank-accounts/bank-accounts';
import { RhTsvContratos } from './tsv-contratos/tsv-contratos';

@NgModule({
  declarations: [
    RhHome,
    RhFuncionarios,
    RhAbonoPermanencia,
    RhFuncionariosHistorico,
    RhFuncionariosVinculos,
    RhCadastralChanges,
    RhFerias,
    RhLicencas,
    RhEmployeeTransfer,
    RhPortalEmployeeTransfer,
    RhEmployeeBankAccounts,
    RhTsvContratos,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    SharedPlatformModule,
    RhRoutingModule,
  ],
})
export class RhModule {}
