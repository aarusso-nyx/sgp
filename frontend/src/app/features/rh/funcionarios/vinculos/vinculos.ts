import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { RhEmployeeRecord, RhStatusHistoryRecord, RhWorkflows } from '../../services/rh-workflows';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../../core/i18n/feature-messages';

type ContractType = 'statutory' | 'celetista' | 'commissioned' | 'temporary';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rh-funcionarios-vinculos',
  standalone: false,
  templateUrl: './vinculos.html',
  styleUrl: './vinculos.scss',
})
export class RhFuncionariosVinculos implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly regimeForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    contractType: ['statutory', [Validators.required]],
    effectiveOn: ['', [Validators.required]],
    endDate: [''],
    commissionPositionId: [''],
    regimeLawReference: ['Lei 8.112/90'],
    justification: ['', [Validators.maxLength(500)]],
    firstConfirmation: [false, [Validators.requiredTrue]],
    secondConfirmation: ['', [Validators.pattern(/^ALTERAR REGIME$/)]],
  });

  employees: RhEmployeeRecord[] = [];
  selected: RhEmployeeRecord | null = null;
  timeline: RhStatusHistoryRecord[] = [];
  loading = false;
  saving = false;
  error = '';
  message = '';

  constructor(private readonly rhWorkflows: RhWorkflows) {}

  get contractType(): ContractType {
    return this.regimeForm.value['contractType'] as ContractType;
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.regimeForm
      .get('contractType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyRegimeValidators());
    this.applyRegimeValidators();
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
            this.select(result.items[0]!);
          }
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m172;
        },
      });
  }

  select(employee: RhEmployeeRecord): void {
    this.selected = employee;
    this.regimeForm.patchValue({ employeeId: employee.id });
    this.timeline = [];
    this.rhWorkflows
      .getEmployeeDossier(employee.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dossier) => {
          this.timeline = dossier.statusHistory;
        },
        error: () => {
          this.timeline = [];
        },
      });
  }

  changeRegime(): void {
    this.applyRegimeValidators();
    if (this.regimeForm.invalid || !this.selected) {
      this.regimeForm.markAllAsTouched();
      return;
    }

    const value = this.compact(this.regimeForm.value as Record<string, unknown>);
    delete value['firstConfirmation'];
    delete value['secondConfirmation'];

    this.saving = true;
    this.error = '';
    this.rhWorkflows
      .changeContractRegime(this.selected.id, value)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m182;
          this.regimeForm.patchValue({
            endDate: '',
            commissionPositionId: '',
            justification: '',
            firstConfirmation: false,
            secondConfirmation: '',
          });
          if (this.selected) this.select(this.selected);
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m183;
        },
      });
  }

  private applyRegimeValidators(): void {
    const endDate = this.regimeForm.get('endDate');
    const commissionPositionId = this.regimeForm.get('commissionPositionId');
    const regimeLawReference = this.regimeForm.get('regimeLawReference');

    endDate?.clearValidators();
    commissionPositionId?.clearValidators();
    regimeLawReference?.clearValidators();

    if (this.contractType === 'temporary') {
      endDate?.setValidators([Validators.required]);
    }
    if (this.contractType === 'commissioned') {
      commissionPositionId?.setValidators([Validators.required]);
    }
    if (this.contractType === 'statutory') {
      regimeLawReference?.setValidators([Validators.required, Validators.maxLength(120)]);
    } else {
      regimeLawReference?.setValidators([Validators.maxLength(120)]);
    }

    endDate?.updateValueAndValidity({ emitEvent: false });
    commissionPositionId?.updateValueAndValidity({ emitEvent: false });
    regimeLawReference?.updateValueAndValidity({ emitEvent: false });
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, entry]) => entry !== null && entry !== undefined && entry !== '',
      ),
    );
  }
}
