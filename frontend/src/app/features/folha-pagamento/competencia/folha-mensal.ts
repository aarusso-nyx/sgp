import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import {
  FolhaMensalService,
  MonthlyPayrollCompetence,
  MonthlyPayrollResult,
} from './folha-mensal.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

type MonthlyAction = 'open' | 'calculate' | 'approve' | 'generate' | 'close' | 'review';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-folha-mensal',
  standalone: false,
  templateUrl: './folha-mensal.html',
  styleUrl: './folha-mensal.scss',
})
export class FolhaMensal {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(FolhaMensalService);

  private readonly current = new Date();
  readonly form = this.fb.nonNullable.group({
    year: [
      this.current.getFullYear(),
      [Validators.required, Validators.min(2000), Validators.max(2100)],
    ],
    month: [
      this.current.getMonth() + 1,
      [Validators.required, Validators.min(1), Validators.max(12)],
    ],
  });

  result: MonthlyPayrollResult | null = null;
  errorMessage = '';
  loadingAction: MonthlyAction | null = null;

  run(action: MonthlyAction): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loadingAction = action;
    this.errorMessage = '';
    this.request(action, this.competence()).subscribe({
      next: (result) => {
        this.result = result;
        this.loadingAction = null;
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : SGP_FEATURE_I18N_MESSAGES.m043;
        this.loadingAction = null;
      },
    });
  }

  disabled(action: MonthlyAction): boolean {
    return this.loadingAction !== null && this.loadingAction !== action;
  }

  private competence(): MonthlyPayrollCompetence {
    return {
      year: Number(this.form.controls.year.value),
      month: Number(this.form.controls.month.value),
    };
  }

  private request(
    action: MonthlyAction,
    input: MonthlyPayrollCompetence,
  ): Observable<MonthlyPayrollResult> {
    switch (action) {
      case 'open':
        return this.service.open(input);
      case 'calculate':
        return this.service.calculate(input);
      case 'approve':
        return this.service.approve(input);
      case 'generate':
        return this.service.generate(input);
      case 'close':
        return this.service.close(input);
      case 'review':
      default:
        return this.service.review(input);
    }
  }
}
