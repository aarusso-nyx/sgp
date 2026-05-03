import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  AssignmentSummary,
  PontoJornadasService,
  WorkScheduleSummary,
} from './ponto-jornadas.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ponto-jornadas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-jornadas.html',
  styleUrl: './ponto-jornadas.scss',
})
export class PontoJornadas implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoJornadasService);

  readonly assignmentForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    workScheduleId: ['', [Validators.required]],
    validFrom: [new Date().toISOString().slice(0, 10), [Validators.required]],
    validTo: [''],
  });

  schedules: WorkScheduleSummary[] = [];
  assignments: AssignmentSummary[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service
      .listSchedules()
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (schedules) => {
          this.schedules = schedules;
          if (!this.assignmentForm.value.workScheduleId && schedules[0]) {
            this.assignmentForm.patchValue({ workScheduleId: schedules[0].workScheduleId });
          }
          this.loadAssignments();
        },
        error: () => {
          this.error = 'Nao foi possivel carregar jornadas.';
        },
      });
  }

  createDefaultSchedule(): void {
    this.saving = true;
    this.error = '';
    this.service
      .createDefaultSchedule()
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (schedule) => {
          this.message = `Jornada ${schedule.code} criada.`;
          this.assignmentForm.patchValue({ workScheduleId: schedule.workScheduleId });
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel criar a jornada.';
        },
      });
  }

  assign(): void {
    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }
    const value = this.assignmentForm.value as Record<string, string>;
    this.saving = true;
    this.error = '';
    this.service
      .assign({
        employeeId: value['employeeId'],
        workScheduleId: value['workScheduleId'],
        validFrom: value['validFrom'],
        validTo: value['validTo'] || undefined,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = 'Atribuicao registrada.';
          this.loadAssignments();
        },
        error: () => {
          this.error = 'Nao foi possivel atribuir a jornada.';
        },
      });
  }

  private loadAssignments(): void {
    this.service
      .listAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assignments) => {
          this.assignments = assignments;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar atribuicoes.';
        },
      });
  }
}
