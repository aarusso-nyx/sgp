import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

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
export class SaudeExames {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);

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

  async load(): Promise<void> {
    this.loading = true;
    try {
      this.exams = await firstValueFrom(this.api.get<MedicalExam[]>('v1/saude/exames'));
    } finally {
      this.loading = false;
    }
  }

  async create(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    try {
      const exam = await firstValueFrom(
        this.api.post<MedicalExam, Record<string, unknown>>('v1/saude/exames', this.form.value),
      );
      this.exams = [exam, ...this.exams];
    } finally {
      this.saving = false;
    }
  }
}
