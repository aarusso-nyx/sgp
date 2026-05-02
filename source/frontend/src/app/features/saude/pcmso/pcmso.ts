import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface PcmsoProgram {
  id: string;
  workLocationName: string | null;
  validFrom: string;
  validUntil: string;
  responsibleDoctorName: string;
  status: string;
}

@Component({
  selector: 'app-saude-pcmso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pcmso.html',
  styleUrl: './pcmso.scss',
})
export class SaudePcmso implements OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.group({
    workLocationId: ['', [Validators.required]],
    validFrom: ['', [Validators.required]],
    validUntil: ['', [Validators.required]],
    responsibleDoctorCrm: ['', [Validators.required]],
    responsibleDoctorName: ['', [Validators.required]],
  });

  readonly examForm = this.formBuilder.group({
    healthProgramId: ['', [Validators.required]],
    medicalExamId: ['', [Validators.required]],
    appliesToRoleId: [''],
    periodicityMonthsOverride: [null],
  });

  programs: PcmsoProgram[] = [];
  saving = false;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api
      .get<PcmsoProgram[]>('v1/saude/programas/pcmso')
      .pipe(takeUntil(this.destroy$))
      .subscribe((programs) => {
        this.programs = programs;
      });
  }

  create(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving = true;
    this.api
      .post<PcmsoProgram, Record<string, unknown>>('v1/saude/programas/pcmso', this.form.value)
      .pipe(finalize(() => (this.saving = false)), takeUntil(this.destroy$))
      .subscribe((program) => {
        this.programs = [program, ...this.programs];
        this.examForm.patchValue({ healthProgramId: program.id });
      });
  }

  activate(program: PcmsoProgram): void {
    this.api
      .patch<PcmsoProgram, Record<string, never>>(
        `v1/saude/programas/pcmso/${program.id}/ativar`,
        {},
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load());
  }

  addExam(): void {
    if (this.examForm.invalid) return this.examForm.markAllAsTouched();
    const id = String(this.examForm.value['healthProgramId']);
    const payload = { ...this.examForm.value, healthProgramId: undefined };
    this.api
      .post<unknown, Record<string, unknown>>(`v1/saude/programas/pcmso/${id}/exames`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }
}
