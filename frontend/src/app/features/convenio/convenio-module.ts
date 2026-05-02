import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConvenioRoutingModule } from './convenio-routing-module';
import { ConvenioHome } from './pages/convenio-home/convenio-home';

@NgModule({
  declarations: [ConvenioHome],
  imports: [CommonModule, ConvenioRoutingModule],
})
export class ConvenioModule {}
