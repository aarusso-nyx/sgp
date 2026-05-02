import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { FolhaPagamentoRoutingModule } from './folha-pagamento-routing-module';
import { FolhaMensal } from './competencia/folha-mensal';
import { FolhaPagamentoHome } from './pages/folha-pagamento-home/folha-pagamento-home';
import { Rubricas } from './rubricas/rubricas';
import { SimulacaoFolha } from './simulacao/simulacao';
import { MoneyBrPipe } from '../../shared/money-br.pipe';

@NgModule({
  declarations: [FolhaPagamentoHome, FolhaMensal, Rubricas, SimulacaoFolha, MoneyBrPipe],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FolhaPagamentoRoutingModule,
  ],
})
export class FolhaPagamentoModule {}
