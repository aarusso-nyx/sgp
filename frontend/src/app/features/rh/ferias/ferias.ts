import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { RhEmployeeRecord, RhWorkflows } from '../services/rh-workflows';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface VacationRecord {
  id: string;
  employeeId: string;
  startsOn: string;
  endsOn: string;
  days: number;
  status: string;
  installmentNumber: number;
  pecuniaryBonusDays: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rh-ferias',
  standalone: false,
  templateUrl: './ferias.html',
  styleUrl: './ferias.scss',
})
export class RhFerias implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly approvalForm = this.formBuilder.group({
    scheduleId: ['', [Validators.required]],
  });

  employees: RhEmployeeRecord[] = [];
  selected: RhEmployeeRecord | null = null;
  queue: VacationRecord[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  constructor(
    private readonly api: ApiClient,
    private readonly rhWorkflows: RhWorkflows,
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmployees(): void {
    this.loading = true;
    this.error = '';
    this.rhWorkflows
      .listEmployees({ page: 1, pageSize: 50 })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.employees = result.items;
          if (!this.selected && result.items.length > 0) {
            this.select(result.items[0]);
          }
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m172;
        },
      });
  }

  select(employee: RhEmployeeRecord): void {
    this.selected = employee;
    this.queue = [];
    this.api
      .get<VacationRecord[]>(`v1/ferias/saldo/${employee.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.queue = [];
        },
        error: () => {
          this.queue = [];
        },
      });
  }

  approve(): void {
    this.transition('aprovar');
  }

  cancel(): void {
    this.transition('cancelar');
  }

  private transition(action: 'aprovar' | 'cancelar'): void {
    if (this.approvalForm.invalid) {
      this.approvalForm.markAllAsTouched();
      return;
    }
    const scheduleId = String(this.approvalForm.value['scheduleId'] ?? '');
    this.saving = true;
    this.error = '';
    this.api
      .post<VacationRecord, Record<string, never>>(
        `v1/ferias/programacao/${scheduleId}/${action}`,
        {},
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (record) => {
          this.message =
            action === 'aprovar'
              ? 'Programacao de ferias aprovada.'
              : 'Programacao de ferias cancelada.';
          this.queue = [record, ...this.queue.filter((item) => item.id !== record.id)];
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m173;
        },
      });
  }
}
