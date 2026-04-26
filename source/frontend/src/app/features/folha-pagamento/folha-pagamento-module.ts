import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FolhaPagamentoRoutingModule } from './folha-pagamento-routing-module';
import { FolhaPagamentoHome } from './pages/folha-pagamento-home/folha-pagamento-home';

@NgModule({
  declarations: [FolhaPagamentoHome],
  imports: [CommonModule, FolhaPagamentoRoutingModule],
})
export class FolhaPagamentoModule {}
