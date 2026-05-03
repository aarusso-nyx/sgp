import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

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
export class SaudeAso implements OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api
      .get<AsoRecord[]>('v1/saude/aso')
      .pipe(takeUntil(this.destroy$))
      .subscribe((records) => {
        this.records = records;
      });
    this.api
      .get<AsoRecord[]>('v1/saude/aso/painel/vencimentos')
      .pipe(takeUntil(this.destroy$))
      .subscribe((records) => {
        this.dueSoon = records;
      });
  }

  schedule(): void {
    if (this.scheduleForm.invalid) return this.scheduleForm.markAllAsTouched();
    this.save<AsoRecord>('v1/saude/aso', this.scheduleForm.value, (record) => {
      this.records = [record, ...this.records];
      this.performForm.patchValue({ asoId: record.id });
      this.attachmentForm.patchValue({ asoId: record.id });
    });
  }

  perform(): void {
    if (this.performForm.invalid) return this.performForm.markAllAsTouched();
    const asoId = String(this.performForm.value['asoId']);
    const payload = { ...this.performForm.value, asoId: undefined };
    this.patch<AsoRecord>(`v1/saude/aso/${asoId}/realizacao`, payload, (record) => {
      this.records = this.records.map((item) => (item.id === record.id ? record : item));
    });
  }

  attach(): void {
    if (this.attachmentForm.invalid) return this.attachmentForm.markAllAsTouched();
    const asoId = String(this.attachmentForm.value['asoId']);
    const payload = { ...this.attachmentForm.value, asoId: undefined };
    this.save<unknown>(`v1/saude/aso/${asoId}/anexos`, payload, () => this.load());
  }

  archive(record: AsoRecord): void {
    this.patch<AsoRecord>(`v1/saude/aso/${record.id}/arquivar`, {}, (updated) => {
      this.records = this.records.map((item) => (item.id === updated.id ? updated : item));
    });
  }

  private save<T>(path: string, payload: Record<string, unknown>, next: (value: T) => void): void {
    this.saving = true;
    this.api
      .post<T, Record<string, unknown>>(path, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(next);
  }

  private patch<T>(path: string, payload: Record<string, unknown>, next: (value: T) => void): void {
    this.saving = true;
    this.api
      .patch<T, Record<string, unknown>>(path, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(next);
  }
}
