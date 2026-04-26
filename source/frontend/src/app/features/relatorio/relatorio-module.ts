import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RelatorioRoutingModule } from './relatorio-routing-module';
import { RelatorioHome } from './pages/relatorio-home/relatorio-home';

@NgModule({
  declarations: [RelatorioHome],
  imports: [CommonModule, RelatorioRoutingModule],
})
export class RelatorioModule {}
