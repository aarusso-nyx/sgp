import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

interface CareerPlan {
  id: string;
  name: string;
  institutingLaw: string;
  startsOn: string;
  classCount: number;
  referenceCount: number;
  progressionRule: string;
  jobPositionIds: string[];
}

interface SalaryAdjustmentResult {
  affectedCount: number;
  affectedLevels: { salaryRangeLevelId: string; baseSalary: string }[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-avaliacao-pccs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule],
  templateUrl: './pccs.html',
  styleUrl: './pccs.scss',
})
export class AvaliacaoPccs implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly api = inject(ApiClient);

  readonly form = this.formBuilder.group({
    name: ['', [Validators.required]],
    institutingLaw: ['', [Validators.required]],
    startsOn: ['', [Validators.required]],
    endsOn: [''],
    classCount: [1, [Validators.required, Validators.min(1)]],
    referenceCount: [1, [Validators.required, Validators.min(1)]],
    progressionRule: ['', [Validators.required]],
    jobPositionIds: [''],
    salaryRangeId: [''],
  });
  readonly adjustmentForm = this.formBuilder.group({
    percentual: ['', [Validators.required]],
    vigenciaInicio: ['', [Validators.required]],
    leiReferencia: ['', [Validators.required]],
    salaryRangeId: ['', [Validators.required]],
  });

  plans: CareerPlan[] = [];
  selected?: CareerPlan;
  adjustment?: SalaryAdjustmentResult;
  error = '';
  message = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api
      .get<CareerPlan[]>('v1/avaliacao/career-plan')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          this.plans = plans;
          this.selected = plans[0];
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m013;
        },
      });
  }

  select(plan: CareerPlan): void {
    this.selected = plan;
    this.form.patchValue({
      name: plan.name,
      institutingLaw: plan.institutingLaw,
      startsOn: String(plan.startsOn).slice(0, 10),
      classCount: plan.classCount,
      referenceCount: plan.referenceCount,
      progressionRule: plan.progressionRule,
      jobPositionIds: plan.jobPositionIds.join(','),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload = {
      ...value,
      classCount: Number(value.classCount),
      referenceCount: Number(value.referenceCount),
      jobPositionIds: String(value.jobPositionIds ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      endsOn: value.endsOn || undefined,
      salaryRangeId: value.salaryRangeId || undefined,
    };
    const request = this.selected?.id
      ? this.api.patch<unknown, typeof payload>(
          `v1/avaliacao/career-plan/${this.selected.id}`,
          payload,
        )
      : this.api.post<unknown, typeof payload>('v1/avaliacao/career-plan', payload);
    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.message = SGP_FEATURE_I18N_MESSAGES.m014;
        this.load();
      },
      error: () => {
        this.error = SGP_FEATURE_I18N_MESSAGES.m015;
      },
    });
  }

  applyAdjustment(): void {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }
    const value = this.adjustmentForm.getRawValue();
    const payload = {
      percentual: String(value.percentual),
      vigenciaInicio: value.vigenciaInicio,
      leiReferencia: value.leiReferencia,
      escopo: { salaryRangeId: value.salaryRangeId },
    };
    this.api
      .post<SalaryAdjustmentResult, typeof payload>(
        'v1/avaliacao/salary-history/reajuste-massa',
        payload,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.adjustment = result;
          this.message = SGP_FEATURE_I18N_MESSAGES.m016;
          this.load();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m017;
        },
      });
  }
}
