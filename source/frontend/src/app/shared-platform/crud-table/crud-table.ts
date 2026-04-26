import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface CrudTableColumn<T = Record<string, unknown>> {
  key: string;
  header: string;
  cell?: (row: T) => string;
}

export interface CrudTableAction<T = Record<string, unknown>> {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

@Component({
  selector: 'app-crud-table',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule],
  templateUrl: './crud-table.html',
  styleUrl: './crud-table.scss',
})
export class CrudTable {
  @Input() columns: CrudTableColumn[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input() actions: CrudTableAction[] = [];
  @Input() emptyLabel = 'Nenhum registro encontrado.';
  @Input() loadingLabel = 'Carregando registros...';
  @Input() tableLabel = 'Tabela de registros';
  @Input() rowLabelKey: string | null = null;
  @Input() loading = false;

  @Output() actionTriggered = new EventEmitter<{
    actionId: string;
    row: Record<string, unknown>;
  }>();

  displayedColumns(): string[] {
    const keys = this.columns.map((column) => column.key);
    return this.actions.length > 0 ? [...keys, '__actions__'] : keys;
  }

  cellValue(column: CrudTableColumn, row: Record<string, unknown>): string {
    if (column.cell) {
      return column.cell(row);
    }

    const value = row[column.key];
    return value === null || value === undefined ? '' : String(value);
  }

  isActionVisible(action: CrudTableAction, row: Record<string, unknown>): boolean {
    return action.visible ? action.visible(row) : true;
  }

  isActionDisabled(action: CrudTableAction, row: Record<string, unknown>): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  actionAriaLabel(action: CrudTableAction, row: Record<string, unknown>): string {
    const rowLabel = this.rowLabel(row);
    return rowLabel ? `${action.label}: ${rowLabel}` : action.label;
  }

  trigger(actionId: string, row: Record<string, unknown>): void {
    this.actionTriggered.emit({ actionId, row });
  }

  trackByColumn(_: number, column: CrudTableColumn): string {
    return column.key;
  }

  trackByAction(_: number, action: CrudTableAction): string {
    return action.id;
  }

  private rowLabel(row: Record<string, unknown>): string {
    if (!this.rowLabelKey) {
      return '';
    }

    const value = row[this.rowLabelKey];
    return value === null || value === undefined ? '' : String(value);
  }
}
