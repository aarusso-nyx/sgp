import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { ConsignadosService, ConsignmentLoan, ConsignmentMargin } from './consignados.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-consignados',
  standalone: false,
  templateUrl: './consignados.html',
  styleUrl: './consignados.scss',
})
export class Consignados {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ConsignadosService);
  private readonly current = new Date();

  readonly form = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    competence: [this.current.toISOString().slice(0, 7), Validators.required],
  });

  margin?: ConsignmentMargin;
  loans: ConsignmentLoan[] = [];
  errorMessage = '';
  loading = false;

  load(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    const employeeId = this.form.controls.employeeId.value.trim();
    const competence = this.form.controls.competence.value;
    this.service.margin(employeeId, competence).subscribe({
      next: (margin) => {
        this.margin = margin;
        this.loadLoans(employeeId);
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error);
        this.loading = false;
      },
    });
  }

  private loadLoans(employeeId: string): void {
    this.service.loans(employeeId).subscribe({
      next: (loans) => {
        this.loans = loans;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = this.messageFrom(error);
        this.loading = false;
      },
    });
  }

  private messageFrom(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Nao foi possivel carregar consignados.';
  }
}
