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
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';

interface PaystubLine {
  code: string;
  description: string;
  kind: string;
  amount: string;
}

interface Paystub {
  payrollRunId: string;
  competence: string;
  status: string;
  employee: {
    registration: string;
    name: string;
  };
  totals: {
    earnings: string;
    deductions: string;
    net: string;
  };
  lines: PaystubLine[];
  html: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sgp-contracheque',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contracheque.html',
  styleUrl: './contracheque.scss',
})
export class Contracheque implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.fb.nonNullable.group({
    competence: [
      this.currentCompetence(),
      [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)],
    ],
  });

  paystub: Paystub | null = null;
  loading = false;
  error = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const competence = params.get('competence') ?? this.currentCompetence();
      this.form.controls.competence.setValue(competence);
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    const competence = this.form.controls.competence.value;
    this.api
      .get<Paystub>(`v1/portal/contracheque/${competence}`)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (paystub) => {
          this.paystub = paystub;
        },
        error: () => {
          this.paystub = null;
          this.error = 'Contracheque indisponivel para a competencia.';
        },
      });
  }

  downloadHtml(): void {
    if (!this.paystub?.html) return;
    const blob = new Blob([this.paystub.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `contracheque-${this.paystub.competence}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private currentCompetence(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
}
