import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { TsvContractChange, TsvContratosService } from './tsv-contratos.service';

@Component({
  selector: 'sgp-rh-tsv-contratos',
  templateUrl: './tsv-contratos.html',
  styleUrl: './tsv-contratos.scss',
  standalone: false,
})
export class RhTsvContratos {
  savedChange?: TsvContractChange;
  transmitting = false;
  saving = false;
  error = '';
  transmission?: Record<string, unknown>;

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TsvContratosService);

  readonly form = this.fb.group({
    contractId: ['', Validators.required],
    effectiveDate: ['', Validators.required],
    reason: ['', Validators.required],
    role: [''],
    monthlyAmount: [''],
    weeklyHours: [''],
    workplaceId: [''],
    supervisorEmployeeId: [''],
  });

  get preview(): Array<{ field: string; value: unknown }> {
    const value = this.form.value;
    return [
      ['role', value.role],
      ['monthly_amount', value.monthlyAmount],
      ['weekly_hours', value.weeklyHours],
      ['workplace_id', value.workplaceId],
      ['supervisor_employee_id', value.supervisorEmployeeId],
    ]
      .filter(([, fieldValue]) => String(fieldValue ?? '').trim().length > 0)
      .map(([field, fieldValue]) => ({ field: String(field), value: fieldValue }));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const contractId = value.contractId ?? '';
    this.saving = true;
    this.error = '';
    this.transmission = undefined;
    this.service
      .update(contractId, {
        effectiveDate: value.effectiveDate ?? '',
        reason: value.reason ?? '',
        role: optional(value.role),
        monthlyAmount: optional(value.monthlyAmount),
        weeklyHours: optional(value.weeklyHours),
        workplaceId: optional(value.workplaceId),
        supervisorEmployeeId: optional(value.supervisorEmployeeId),
      })
      .subscribe({
        next: (change) => {
          this.savedChange = change;
          this.saving = false;
        },
        error: (error: { message?: string }) => {
          this.error = error.message ?? 'Falha ao salvar alteração TS-V.';
          this.saving = false;
        },
      });
  }

  transmit(): void {
    if (!this.savedChange) return;
    this.transmitting = true;
    this.error = '';
    this.service.transmit(this.savedChange.id).subscribe({
      next: (result) => {
        this.transmission = result;
        this.transmitting = false;
      },
      error: (error: { message?: string }) => {
        this.error = error.message ?? 'Falha ao transmitir S-2306.';
        this.transmitting = false;
      },
    });
  }
}

function optional(value: string | null | undefined): string | undefined {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
