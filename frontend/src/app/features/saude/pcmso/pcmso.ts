import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-pcmso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pcmso.html',
  styleUrl: './pcmso.scss',
})
export class SaudePcmso {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);

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

  async load(): Promise<void> {
    this.programs = await firstValueFrom(this.api.get<PcmsoProgram[]>('v1/saude/programas/pcmso'));
  }

  async create(): Promise<void> {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving = true;
    try {
      const program = await firstValueFrom(
        this.api.post<PcmsoProgram, Record<string, unknown>>(
          'v1/saude/programas/pcmso',
          this.form.value,
        ),
      );
      this.programs = [program, ...this.programs];
      this.examForm.patchValue({ healthProgramId: program.id });
    } finally {
      this.saving = false;
    }
  }

  async activate(program: PcmsoProgram): Promise<void> {
    await firstValueFrom(
      this.api.patch<PcmsoProgram, Record<string, never>>(
        `v1/saude/programas/pcmso/${program.id}/ativar`,
        {},
      ),
    );
    await this.load();
  }

  async addExam(): Promise<void> {
    if (this.examForm.invalid) return this.examForm.markAllAsTouched();
    const id = String(this.examForm.value['healthProgramId']);
    const payload = { ...this.examForm.value, healthProgramId: undefined };
    await firstValueFrom(
      this.api.post<unknown, Record<string, unknown>>(
        `v1/saude/programas/pcmso/${id}/exames`,
        payload,
      ),
    );
  }
}
