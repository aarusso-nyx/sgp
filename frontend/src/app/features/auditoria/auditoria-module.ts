import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { SharedPlatformModule } from '../shared-platform/shared-platform-module';
import { AuditoriaRoutingModule } from './auditoria-routing-module';
import { AuditoriaHome } from './pages/auditoria-home/auditoria-home';

@NgModule({
  declarations: [AuditoriaHome],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    SharedPlatformModule,
    AuditoriaRoutingModule,
  ],
})
export class AuditoriaModule {}
