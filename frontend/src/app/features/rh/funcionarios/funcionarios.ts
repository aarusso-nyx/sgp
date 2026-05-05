import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { RhEmployeeRecord, RhWorkflows } from '../services/rh-workflows';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rh-funcionarios',
  standalone: false,
  templateUrl: './funcionarios.html',
  styleUrl: './funcionarios.scss',
})
export class RhFuncionarios implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly admissionForm = this.formBuilder.group({
    registration: ['', [Validators.required, Validators.maxLength(40)]],
    name: ['', [Validators.required, Validators.maxLength(180)]],
    cpf: ['', [Validators.maxLength(14)]],
    email: ['', [Validators.maxLength(120)]],
    hiredOn: ['', [Validators.required]],
    appointedOn: [''],
    possessionOn: [''],
    exerciseOn: [''],
    pisPasep: ['', [Validators.maxLength(40)]],
    rg: ['', [Validators.maxLength(40)]],
    motherName: ['', [Validators.maxLength(80)]],
    fatherName: ['', [Validators.maxLength(80)]],
    legalBasis: ['', [Validators.maxLength(500)]],
  });

  readonly terminationForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    terminationDate: ['', [Validators.required]],
    terminationReasonId: ['', [Validators.required]],
    justification: ['', [Validators.maxLength(500)]],
  });

  employees: RhEmployeeRecord[] = [];
  selected: RhEmployeeRecord | null = null;
  search = '';
  loading = false;
  saving = false;
  error = '';
  message = '';

  constructor(private readonly rhWorkflows: RhWorkflows) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.rhWorkflows
      .listEmployees({ search: this.search, page: 1, pageSize: 50 })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.employees = result.items;
          this.selected = this.selected
            ? (result.items.find((item) => item.id === this.selected?.id) ?? null)
            : (result.items[0] ?? null);
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m172;
        },
      });
  }

  admit(): void {
    if (this.admissionForm.invalid) {
      this.admissionForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.rhWorkflows
      .createEmployee(this.compact(this.admissionForm.value as Record<string, unknown>))
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (employee) => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m177(employee.registration);
          this.admissionForm.reset();
          this.selected = employee;
          this.load();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m178;
        },
      });
  }

  terminate(): void {
    if (this.terminationForm.invalid) {
      this.terminationForm.markAllAsTouched();
      return;
    }
    const value = this.terminationForm.value as Record<string, unknown>;
    const employeeId = String(value['employeeId']);
    this.saving = true;
    this.error = '';
    this.rhWorkflows
      .terminateEmployee(employeeId, this.compact(value))
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m179;
          this.terminationForm.reset();
          this.load();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m180;
        },
      });
  }

  select(employee: RhEmployeeRecord): void {
    this.selected = employee;
    this.terminationForm.patchValue({ employeeId: employee.id });
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, entry]) => entry !== null && entry !== undefined && entry !== '',
      ),
    );
  }
}
