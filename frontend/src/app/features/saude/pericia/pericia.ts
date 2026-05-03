import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

interface MedicalLeave {
  id: string;
  employeeId: string;
  grantedDays: number;
  startsOn: string;
  endsOn: string;
  status: string;
  cidCode: string | null;
}

interface ScheduledMedicalAppointment {
  appointment_id: string;
  scheduledOn: string;
  scheduledTime: string;
  status: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-saude-pericia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pericia.html',
  styleUrl: './pericia.scss',
})
export class SaudePericia implements OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly scheduleForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    slotRef: ['', [Validators.required]],
    scheduledOn: ['', [Validators.required]],
    scheduledTime: ['09:00', [Validators.required]],
    contactPhone: [''],
  });

  readonly opinionForm = this.formBuilder.group({
    appointmentId: ['', [Validators.required]],
    physicianId: ['', [Validators.required]],
    reason: ['', [Validators.required]],
    decision: ['granted', [Validators.required]],
    cidCode: [''],
    cidSecondary: [''],
    grantedDays: [15, [Validators.min(1)]],
    startsOn: [''],
    endsOn: [''],
    opinionNotes: [''],
  });

  readonly lookupForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
  });

  appointments: ScheduledMedicalAppointment[] = [];
  leaves: MedicalLeave[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  schedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.api
      .post<ScheduledMedicalAppointment, Record<string, unknown>>(
        'v1/licencas/saude/agendamento',
        this.scheduleForm.value,
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (appointment) => {
          this.appointments = [appointment, ...this.appointments];
          this.opinionForm.patchValue({ appointmentId: appointment.appointment_id });
          this.message = 'Agendamento registrado.';
        },
        error: () => {
          this.error = 'Nao foi possivel registrar o agendamento.';
        },
      });
  }

  recordOpinion(): void {
    if (this.opinionForm.invalid) {
      this.opinionForm.markAllAsTouched();
      return;
    }
    const appointmentId = String(this.opinionForm.value['appointmentId']);
    this.saving = true;
    this.error = '';
    this.api
      .post<unknown, Record<string, unknown>>(`v1/pericia/agendamentos/${appointmentId}/parecer`, {
        ...this.opinionForm.value,
        appointmentId: undefined,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = 'Parecer pericial registrado.';
          const employeeId = String(this.scheduleForm.value['employeeId'] || '').trim();
          if (employeeId) {
            this.lookupForm.patchValue({ employeeId });
            this.loadLeaves();
          }
        },
        error: () => {
          this.error = 'Nao foi possivel registrar o parecer.';
        },
      });
  }

  loadLeaves(): void {
    const employeeId = String(this.lookupForm.value['employeeId'] ?? '').trim();
    if (!employeeId) {
      this.lookupForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.api
      .get<MedicalLeave[]>(`v1/licencas/saude/${employeeId}`)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (leaves) => {
          this.leaves = leaves;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar as licencas de saude.';
        },
      });
  }
}
