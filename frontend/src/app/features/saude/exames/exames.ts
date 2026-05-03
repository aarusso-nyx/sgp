import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface MedicalExam {
  id: string;
  code: string;
  name: string;
  examType: string;
  periodicityMonths: number | null;
  active: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-exames',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exames.html',
  styleUrl: './exames.scss',
})
export class SaudeExames implements OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    examType: ['CLINICO', [Validators.required]],
    isMandatoryAdmission: [true],
    isMandatoryPeriodic: [true],
    periodicityMonths: [12],
    active: [true],
  });

  exams: MedicalExam[] = [];
  loading = false;
  saving = false;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.api
      .get<MedicalExam[]>('v1/saude/exames')
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((exams) => {
        this.exams = exams;
      });
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.api
      .post<MedicalExam, Record<string, unknown>>('v1/saude/exames', this.form.value)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((exam) => {
        this.exams = [exam, ...this.exams];
      });
  }
}
