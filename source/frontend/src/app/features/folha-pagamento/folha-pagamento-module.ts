import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { FolhaPagamentoRoutingModule } from './folha-pagamento-routing-module';
import { Contracheques } from './contracheques/contracheques';
import { FolhaMensal } from './competencia/folha-mensal';
import { Consignados } from './consignados/consignados';
import { ConsignadoPortabilidade } from './consignados/portabilidade/portabilidade';
import { FolhaPagamentoHome } from './pages/folha-pagamento-home/folha-pagamento-home';
import { RescisaoFolha } from './processamentos/rescisao/rescisao';
import { RemessaBancaria } from './remessa/remessa-bancaria';
import { Rubricas } from './rubricas/rubricas';
import { SimulacaoFolha } from './simulacao/simulacao';
import { MoneyBrPipe } from '../../shared/money-br.pipe';

@NgModule({
  declarations: [
    FolhaPagamentoHome,
    FolhaMensal,
    Contracheques,
    Consignados,
    ConsignadoPortabilidade,
    Rubricas,
    SimulacaoFolha,
    RescisaoFolha,
    RemessaBancaria,
    MoneyBrPipe,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    FolhaPagamentoRoutingModule,
  ],
})
export class FolhaPagamentoModule {}
