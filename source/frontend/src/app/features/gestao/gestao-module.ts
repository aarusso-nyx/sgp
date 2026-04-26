import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { SharedPlatformModule } from '../shared-platform/shared-platform-module';
import { GestaoRoutingModule } from './gestao-routing-module';
import { GestaoHome } from './pages/gestao-home/gestao-home';

@NgModule({
  declarations: [GestaoHome],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    SharedPlatformModule,
    GestaoRoutingModule,
  ],
})
export class GestaoModule {}
