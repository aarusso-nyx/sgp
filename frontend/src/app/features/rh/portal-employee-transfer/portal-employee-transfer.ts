import { Component, OnDestroy, inject } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface EmployeeTransfer {
  id: string;
  tipo: string;
  dataEfeito: string;
  status: string;
}

@Component({
  selector: 'app-rh-portal-employee-transfer',
  standalone: false,
  templateUrl: './portal-employee-transfer.html',
  styleUrl: './portal-employee-transfer.scss',
})
export class RhPortalEmployeeTransfer implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    destinoWorkLocationId: ['', [Validators.required]],
    dataEfeito: ['', [Validators.required]],
    tipo: ['pedido_criterio', [Validators.required]],
    notes: [''],
  });

  history: EmployeeTransfer[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  constructor(private readonly api: ApiClient) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHistory(): void {
    const employeeId = String(this.form.value['employeeId'] ?? '');
    if (!employeeId) return;
    this.loading = true;
    this.api
      .get<EmployeeTransfer[]>(`v1/rh/employee-transfer/employee/${employeeId}`)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (items) => {
          this.history = items;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o historico.';
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.api
      .post<EmployeeTransfer, typeof this.form.value>('v1/rh/employee-transfer', this.form.value)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (item) => {
          this.message = 'Solicitacao registrada.';
          this.history = [item, ...this.history];
        },
        error: () => {
          this.error = 'Nao foi possivel registrar a solicitacao.';
        },
      });
  }
}
