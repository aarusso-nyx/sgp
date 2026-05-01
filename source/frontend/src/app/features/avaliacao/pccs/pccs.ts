import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';

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
  selector: 'app-avaliacao-pccs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule],
  templateUrl: './pccs.html',
  styleUrl: './pccs.scss',
})
export class AvaliacaoPccs implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly http = inject(HttpClient);

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
    this.http
      .get<CareerPlan[]>('/api/v1/avaliacao/career-plan')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          this.plans = plans;
          this.selected = plans[0];
        },
        error: () => {
          this.error = 'Nao foi possivel carregar os PCCS.';
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
      ? this.http.patch(`/api/v1/avaliacao/career-plan/${this.selected.id}`, payload)
      : this.http.post('/api/v1/avaliacao/career-plan', payload);
    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.message = 'PCCS salvo.';
        this.load();
      },
      error: () => {
        this.error = 'Nao foi possivel salvar o PCCS.';
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
    this.http
      .post<SalaryAdjustmentResult>('/api/v1/avaliacao/salary-history/reajuste-massa', payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.adjustment = result;
          this.message = 'Reajuste aplicado.';
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel aplicar o reajuste.';
        },
      });
  }
}
