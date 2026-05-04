import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface AsoRecord {
  id: string;
  employeeId: string;
  employeeName: string | null;
  asoKind: string;
  scheduledAt: string;
  performedAt: string | null;
  conclusion: string | null;
  nextExamDueAt: string | null;
  status: string;
  attachmentCount: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-aso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './aso.html',
  styleUrl: './aso.scss',
})
export class SaudeAso {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly scheduleForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    asoKind: ['ADMISSIONAL', [Validators.required]],
    scheduledAt: ['', [Validators.required]],
  });

  readonly performForm = this.formBuilder.group({
    asoId: ['', [Validators.required]],
    performedAt: ['', [Validators.required]],
    doctorCrm: ['', [Validators.required]],
    doctorName: ['', [Validators.required]],
    conclusion: ['APTO', [Validators.required]],
    restrictionText: [''],
  });

  readonly attachmentForm = this.formBuilder.group({
    asoId: ['', [Validators.required]],
    fileUri: ['', [Validators.required]],
    sha256: ['', [Validators.required]],
    mime: ['application/pdf', [Validators.required]],
  });

  records: AsoRecord[] = [];
  dueSoon: AsoRecord[] = [];
  saving = false;

  async load(): Promise<void> {
    const { records, dueSoon } = await firstValueFrom(
      forkJoin({
        records: this.api.get<AsoRecord[]>('v1/saude/aso'),
        dueSoon: this.api.get<AsoRecord[]>('v1/saude/aso/painel/vencimentos'),
      }),
    );
    this.records = records;
    this.dueSoon = dueSoon;
  }

  schedule(): void {
    if (this.scheduleForm.invalid) return this.scheduleForm.markAllAsTouched();
    void this.save<AsoRecord>('v1/saude/aso', this.scheduleForm.value, (record) => {
      this.records = [record, ...this.records];
      this.performForm.patchValue({ asoId: record.id });
      this.attachmentForm.patchValue({ asoId: record.id });
    });
  }

  perform(): void {
    if (this.performForm.invalid) return this.performForm.markAllAsTouched();
    const asoId = String(this.performForm.value['asoId']);
    const payload = { ...this.performForm.value, asoId: undefined };
    void this.patch<AsoRecord>(`v1/saude/aso/${asoId}/realizacao`, payload, (record) => {
      this.records = this.records.map((item) => (item.id === record.id ? record : item));
    });
  }

  attach(): void {
    if (this.attachmentForm.invalid) return this.attachmentForm.markAllAsTouched();
    const asoId = String(this.attachmentForm.value['asoId']);
    const payload = { ...this.attachmentForm.value, asoId: undefined };
    void this.save<unknown>(`v1/saude/aso/${asoId}/anexos`, payload, () => void this.load());
  }

  archive(record: AsoRecord): void {
    void this.patch<AsoRecord>(`v1/saude/aso/${record.id}/arquivar`, {}, (updated) => {
      this.records = this.records.map((item) => (item.id === updated.id ? updated : item));
    });
  }

  private async save<T>(
    path: string,
    payload: Record<string, unknown>,
    next: (value: T) => void,
  ): Promise<void> {
    this.saving = true;
    try {
      next(await firstValueFrom(this.api.post<T, Record<string, unknown>>(path, payload)));
    } finally {
      this.saving = false;
    }
  }

  private async patch<T>(
    path: string,
    payload: Record<string, unknown>,
    next: (value: T) => void,
  ): Promise<void> {
    this.saving = true;
    try {
      next(await firstValueFrom(this.api.patch<T, Record<string, unknown>>(path, payload)));
    } finally {
      this.saving = false;
    }
  }
}
