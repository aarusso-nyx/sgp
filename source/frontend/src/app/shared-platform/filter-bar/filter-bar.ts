import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'select';
  placeholder?: string;
  options?: FilterOption[];
}

@Component({
  selector: 'app-filter-bar',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class FilterBar {
  private readonly formBuilder = inject(UntypedFormBuilder);

  private fieldsValue: FilterField[] = [];
  private initialValuesValue: Record<string, string> = {};

  @Input() ariaLabel = 'Filtros de pesquisa';
  @Input() applyLabel = 'Aplicar filtros';
  @Input() clearLabel = 'Limpar filtros';
  @Input() allOptionsLabel = 'Todos';

  @Input()
  set fields(value: FilterField[]) {
    this.fieldsValue = value ?? [];
    this.rebuildForm();
  }
  get fields(): FilterField[] {
    return this.fieldsValue;
  }

  @Input()
  set initialValues(value: Record<string, string>) {
    this.initialValuesValue = value ?? {};
    this.rebuildForm();
  }
  get initialValues(): Record<string, string> {
    return this.initialValuesValue;
  }

  @Output() applyFilters = new EventEmitter<Record<string, string>>();
  @Output() clearFilters = new EventEmitter<void>();

  readonly form: UntypedFormGroup = this.formBuilder.group({});

  onApply(): void {
    this.applyFilters.emit(this.form.getRawValue() as Record<string, string>);
  }

  onClear(): void {
    this.rebuildForm();
    this.clearFilters.emit();
  }

  fieldAutocomplete(field: FilterField): string {
    return field.type === 'date' ? 'off' : 'on';
  }

  trackByField(_: number, field: FilterField): string {
    return field.key;
  }

  trackByOption(_: number, option: FilterOption): string {
    return option.value;
  }

  private rebuildForm(): void {
    for (const key of Object.keys(this.form.controls)) {
      this.form.removeControl(key);
    }

    for (const field of this.fieldsValue) {
      this.form.addControl(
        field.key,
        this.formBuilder.control(this.initialValuesValue[field.key] ?? ''),
      );
    }
  }
}
