import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

type Section = 'solicitar' | 'acompanhar' | 'comprovante';

interface MedicalLeave {
  id: string;
  grantedDays: number;
  startsOn: string;
  endsOn: string;
  status: string;
  cidCode: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-licencas-saude',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './saude.html',
  styleUrl: './saude.scss',
})
export class LicencasSaude implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    slotRef: ['', [Validators.required]],
    scheduledOn: ['', [Validators.required]],
    scheduledTime: ['09:00', [Validators.required]],
    contactPhone: [''],
  });

  section: Section = 'solicitar';
  leaves: MedicalLeave[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.route.url.pipe(takeUntil(this.destroy$)).subscribe((segments) => {
      this.section = (segments.at(-1)?.path ?? 'solicitar') as Section;
      this.message = '';
      this.error = '';
      if (this.section !== 'solicitar') {
        this.load();
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .post<unknown, Record<string, unknown>>('v1/licencas/saude/agendamento', this.form.value)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = 'Solicitacao de pericia registrada.';
        },
        error: () => {
          this.error = 'Nao foi possivel registrar a solicitacao.';
        },
      });
  }

  load(): void {
    const employeeId = String(this.form.value['employeeId'] ?? '').trim();
    if (!employeeId) return;
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .get<MedicalLeave[]>(`v1/licencas/saude/${employeeId}`)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (leaves) => {
          this.leaves = leaves;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar as licencas.';
        },
      });
  }
}
