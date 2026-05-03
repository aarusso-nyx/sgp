import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { RhEmployeeRecord, RhWorkflows } from '../services/rh-workflows';

interface LeaveRecord {
  id: string;
  employeeId: string;
  reason: string;
  startsOn: string;
  endsOn: string;
  days: number;
  paid: boolean;
  status: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rh-licencas',
  standalone: false,
  templateUrl: './licencas.html',
  styleUrl: './licencas.scss',
})
export class RhLicencas implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly approvalForm = this.formBuilder.group({
    leaveId: ['', [Validators.required]],
    reason: [''],
  });

  employees: RhEmployeeRecord[] = [];
  selected: RhEmployeeRecord | null = null;
  queue: LeaveRecord[] = [];
  filtered: LeaveRecord[] = [];
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
          this.error = 'Nao foi possivel carregar os servidores.';
        },
      });
  }

  select(employee: RhEmployeeRecord): void {
    this.selected = employee;
    this.api
      .get<LeaveRecord[]>(`v1/licencas/${employee.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (records) => {
          this.queue = records;
          this.applyFilter();
        },
        error: () => {
          this.queue = [];
          this.filtered = [];
        },
      });
  }

  applyFilter(): void {
    const reason = String(this.approvalForm.value['reason'] ?? '').trim();
    this.filtered = reason
      ? this.queue.filter((record) => record.reason === reason)
      : [...this.queue];
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
    const leaveId = String(this.approvalForm.value['leaveId'] ?? '');
    this.saving = true;
    this.error = '';
    this.api
      .post<LeaveRecord, Record<string, never>>(`v1/licencas/${leaveId}/${action}`, {})
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (record) => {
          this.message = action === 'aprovar' ? 'Licenca aprovada.' : 'Licenca cancelada.';
          this.queue = [record, ...this.queue.filter((item) => item.id !== record.id)];
          this.applyFilter();
        },
        error: () => {
          this.error = 'Nao foi possivel atualizar a licenca.';
        },
      });
  }
}
