import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface PgrProgram {
  id: string;
  workLocationName: string | null;
  validFrom: string;
  validUntil: string;
  responsibleEngineerId: string | null;
  riskSnapshot: unknown[];
  status: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-pgr',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pgr.html',
  styleUrl: './pgr.scss',
})
export class SaudePgr implements OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.group({
    workLocationId: ['', [Validators.required]],
    validFrom: ['', [Validators.required]],
    validUntil: ['', [Validators.required]],
    responsibleEngineerId: [''],
  });

  programs: PgrProgram[] = [];
  saving = false;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.api
      .get<PgrProgram[]>('v1/saude/programas/pgr')
      .pipe(takeUntil(this.destroy$))
      .subscribe((programs) => {
        this.programs = programs;
      });
  }

  create(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saving = true;
    this.api
      .post<PgrProgram, Record<string, unknown>>('v1/saude/programas/pgr', this.form.value)
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe((program) => {
        this.programs = [program, ...this.programs];
      });
  }

  activate(program: PgrProgram): void {
    this.api
      .patch<PgrProgram, Record<string, never>>(`v1/saude/programas/pgr/${program.id}/ativar`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load());
  }
}
