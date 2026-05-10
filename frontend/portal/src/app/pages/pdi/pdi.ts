import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, finalize, of, switchMap, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';

interface PortalCadastro {
  id: string;
}

interface DevelopmentPlan {
  id: string;
  employeeId: string;
  managerEmployeeId: string | null;
  periodStart: string;
  periodEnd: string;
  status: string;
  objective: string;
  managerReview: string;
  reviewedAt: string | null;
}

interface DevelopmentPlanGoal {
  id: string;
  developmentPlanId: string;
  description: string;
  status: string;
  dueAt: string | null;
  completedAt: string | null;
  notes: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pdi',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pdi.html',
  styleUrl: './pdi.scss',
})
export class Pdi implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly goalForm = this.formBuilder.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    dueAt: [''],
    notes: ['', [Validators.maxLength(2000)]],
  });

  plans: DevelopmentPlan[] = [];
  activePlan: DevelopmentPlan | null = null;
  goals: DevelopmentPlanGoal[] = [];
  employeeId: string | null = null;
  loading = false;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .get<PortalCadastro>('v1/portal/meus-dados/cadastro')
      .pipe(
        switchMap((cadastro) => {
          this.employeeId = cadastro.id;
          return this.api.get<DevelopmentPlan[]>(`v1/rh/pdi?employeeId=${cadastro.id}`);
        }),
        switchMap((plans) => {
          this.plans = plans;
          this.activePlan = plans.find((plan) => plan.status === 'ACTIVE') ?? plans[0] ?? null;
          if (!this.activePlan) {
            this.goals = [];
            return of([] as DevelopmentPlanGoal[]);
          }
          return this.api.get<DevelopmentPlanGoal[]>(`v1/rh/pdi/${this.activePlan.id}/metas`);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (goals) => {
          this.goals = goals;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar seu PDI.';
        },
      });
  }

  addGoal(): void {
    if (!this.activePlan || this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      return;
    }
    const value = this.goalForm.getRawValue();
    const body: Record<string, unknown> = { description: value.description };
    if (value.dueAt) body['dueAt'] = value.dueAt;
    if (value.notes) body['notes'] = value.notes;

    this.saving = true;
    this.cdr.markForCheck();
    this.api
      .post<DevelopmentPlanGoal, Record<string, unknown>>(
        `v1/rh/pdi/${this.activePlan.id}/metas`,
        body,
      )
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (created) => {
          this.goals = [...this.goals, created];
          this.message = 'Meta adicionada.';
          this.goalForm.reset({ description: '', dueAt: '', notes: '' });
        },
        error: () => {
          this.error = 'Nao foi possivel adicionar a meta.';
        },
      });
  }

  markGoalDone(goal: DevelopmentPlanGoal): void {
    this.saving = true;
    this.cdr.markForCheck();
    this.api
      .patch<DevelopmentPlanGoal, Record<string, unknown>>(`v1/rh/pdi/metas/${goal.id}`, {
        status: 'DONE',
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (updated) => {
          this.goals = this.goals.map((current) => (current.id === updated.id ? updated : current));
          this.message = 'Meta atualizada.';
        },
        error: () => {
          this.error = 'Nao foi possivel atualizar a meta.';
        },
      });
  }
}
