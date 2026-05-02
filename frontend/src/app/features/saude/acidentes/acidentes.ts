import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface WorkAccident {
  id: string;
  employeeId: string;
  employeeName: string | null;
  accidentAt: string;
  accidentType: string;
  severity: string;
  deathAt: string | null;
  status: string;
  latestCatKind: string | null;
  latestDeadlineAt: string | null;
}

interface CatDeadlineAlert {
  id: string;
  workAccidentId: string;
  employeeName: string;
  catKind: string;
  deadlineAt: string;
  enqueuedAt: string | null;
  esocialEventId: string | null;
}

@Component({
  selector: 'app-saude-acidentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './acidentes.html',
  styleUrl: './acidentes.scss',
})
export class SaudeAcidentes implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly accidentForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    accidentAt: ['', [Validators.required]],
    accidentType: ['TIPICO', [Validators.required]],
    locationText: ['', [Validators.required]],
    bodyPartCode: ['000000001', [Validators.required]],
    agentCauseCode: ['000000001', [Validators.required]],
    witnessText: [''],
    severity: ['LEVE', [Validators.required]],
    deathAt: [''],
  });

  readonly catForm = this.formBuilder.group({
    workAccidentId: ['', [Validators.required]],
    catKind: ['INICIAL', [Validators.required]],
    doctorCrm: ['', [Validators.required]],
    doctorName: ['', [Validators.required]],
    internment: [false],
    leaveUntil: [''],
  });

  accidents: WorkAccident[] = [];
  alerts: CatDeadlineAlert[] = [];
  saving = false;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api
      .get<WorkAccident[]>('v1/saude/acidentes')
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.accidents = rows));
    this.api
      .get<CatDeadlineAlert[]>('v1/saude/acidentes/prazos')
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.alerts = rows));
  }

  register(): void {
    if (this.accidentForm.invalid) return this.accidentForm.markAllAsTouched();
    this.save('v1/saude/acidentes', this.compact(this.accidentForm.value));
  }

  emitCat(): void {
    if (this.catForm.invalid) return this.catForm.markAllAsTouched();
    const workAccidentId = String(this.catForm.value['workAccidentId']);
    const payload = this.compact({ ...this.catForm.value, workAccidentId: undefined });
    this.save(`v1/saude/acidentes/${workAccidentId}/cat`, payload);
  }

  close(record: WorkAccident): void {
    this.saving = true;
    this.api
      .patch<WorkAccident, Record<string, never>>(`v1/saude/acidentes/${record.id}/encerrar`, {})
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.load(),
        error: () => (this.error = 'Nao foi possivel encerrar o acidente.'),
      });
  }

  select(record: WorkAccident, catKind = 'INICIAL'): void {
    this.catForm.patchValue({ workAccidentId: record.id, catKind });
  }

  private save(path: string, payload: Record<string, unknown>): void {
    this.saving = true;
    this.error = '';
    this.api
      .post<unknown, Record<string, unknown>>(path, payload)
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.load(),
        error: () => (this.error = 'Nao foi possivel salvar a CAT.'),
      });
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== '' && entry !== undefined),
    );
  }
}
