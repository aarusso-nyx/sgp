import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';

type FeriasSection = 'solicitar' | 'historico' | 'programacao';

interface VacationRecord {
  id: string;
  startsOn: string;
  endsOn: string;
  days: number;
  status: string;
  installmentNumber: number;
  pecuniaryBonusDays: number;
}

interface VacationBalance {
  accrualPeriodStart: string;
  accrualPeriodEnd: string;
  accruedDays: number;
  usedDays: number;
  pecuniaryBonusDays: number;
  availableDays: number;
}

@Component({
  selector: 'app-ferias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ferias.html',
  styleUrl: './ferias.scss',
})
export class Ferias implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.nonNullable.group({
    employeeId: ['', [Validators.required]],
    accrualPeriodStart: ['', [Validators.required]],
    accrualPeriodEnd: ['', [Validators.required]],
    pecuniaryBonusDays: [0, [Validators.min(0), Validators.max(10)]],
    installments: this.formBuilder.array([this.installmentGroup()]),
  });

  section: FeriasSection = 'solicitar';
  balances: VacationBalance[] = [];
  records: VacationRecord[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  get installments(): FormArray {
    return this.form.controls.installments;
  }

  ngOnInit(): void {
    this.route.url.pipe(takeUntil(this.destroy$)).subscribe((segments) => {
      this.section = (segments.at(-1)?.path ?? 'solicitar') as FeriasSection;
      this.message = '';
      this.error = '';
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addInstallment(): void {
    if (this.installments.length >= 3) return;
    this.installments.push(this.installmentGroup());
  }

  removeInstallment(index: number): void {
    if (this.installments.length <= 1) return;
    this.installments.removeAt(index);
  }

  loadBalance(): void {
    const employeeId = this.form.controls.employeeId.value.trim();
    if (!employeeId) {
      this.form.controls.employeeId.markAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.api
      .get<VacationBalance[]>(`v1/ferias/saldo/${employeeId}`)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (rows) => {
          this.balances = rows;
          const current = rows[0];
          if (current) {
            this.form.patchValue({
              accrualPeriodStart: current.accrualPeriodStart,
              accrualPeriodEnd: current.accrualPeriodEnd,
            });
          }
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o saldo de ferias.';
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
      .post<VacationRecord[], Record<string, unknown>>('v1/ferias/programacao', {
        ...this.form.getRawValue(),
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (records) => {
          this.records = records;
          this.message = 'Programacao enviada para aprovacao.';
        },
        error: () => {
          this.error = 'Nao foi possivel enviar a programacao de ferias.';
        },
      });
  }

  private installmentGroup() {
    return this.formBuilder.nonNullable.group({
      startsOn: ['', [Validators.required]],
      endsOn: ['', [Validators.required]],
      days: [30, [Validators.required, Validators.min(1)]],
    });
  }
}
