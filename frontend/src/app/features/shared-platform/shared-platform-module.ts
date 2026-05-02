import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedPlatformRoutingModule } from './shared-platform-routing-module';
import { ConfirmationDialog } from '../../shared-platform/confirmation-dialog/confirmation-dialog';
import { CrudTable } from '../../shared-platform/crud-table/crud-table';
import { FilterBar } from '../../shared-platform/filter-bar/filter-bar';
import { Shell } from '../../shared-platform/shell/shell';

@NgModule({
  declarations: [ConfirmationDialog],
  imports: [CommonModule, SharedPlatformRoutingModule, CrudTable, FilterBar, Shell],
  exports: [ConfirmationDialog, CrudTable, FilterBar, Shell],
})
export class SharedPlatformModule {}
