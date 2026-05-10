import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, finalize, switchMap, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';

interface PortalCadastro {
  id: string;
}

interface TrainingCertificate {
  id: string;
  employeeId: string;
  courseName: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string | null;
  hoursWorkload: number | null;
  notes: string;
  createdAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-certificacoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './certificacoes.html',
  styleUrl: './certificacoes.scss',
})
export class Certificacoes implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.nonNullable.group({
    courseName: ['', [Validators.required, Validators.maxLength(240)]],
    issuer: ['', [Validators.required, Validators.maxLength(240)]],
    issuedAt: ['', [Validators.required]],
    expiresAt: [''],
    hoursWorkload: [null as number | null],
    notes: ['', [Validators.maxLength(2000)]],
  });

  certificates: TrainingCertificate[] = [];
  employeeId: string | null = null;
  loading = false;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .get<PortalCadastro>('v1/portal/meus-dados/cadastro')
      .pipe(
        switchMap((cadastro) => {
          this.employeeId = cadastro.id;
          return this.api.get<TrainingCertificate[]>(
            `v1/rh/certificacoes?employeeId=${cadastro.id}`,
          );
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (rows) => {
          this.certificates = rows;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar suas certificacoes.';
        },
      });
  }

  submit(): void {
    if (this.form.invalid || !this.employeeId) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: Record<string, unknown> = {
      employeeId: this.employeeId,
      courseName: value.courseName,
      issuer: value.issuer,
      issuedAt: value.issuedAt,
    };
    if (value.expiresAt) body['expiresAt'] = value.expiresAt;
    if (value.hoursWorkload !== null && value.hoursWorkload !== undefined) {
      body['hoursWorkload'] = value.hoursWorkload;
    }
    if (value.notes) body['notes'] = value.notes;

    this.saving = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .post<TrainingCertificate, Record<string, unknown>>('v1/rh/certificacoes', body)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (created) => {
          this.certificates = [
            created,
            ...this.certificates.filter((cert) => cert.id !== created.id),
          ];
          this.message = 'Certificacao registrada.';
          this.form.reset({
            courseName: '',
            issuer: '',
            issuedAt: '',
            expiresAt: '',
            hoursWorkload: null,
            notes: '',
          });
        },
        error: () => {
          this.error = 'Nao foi possivel registrar a certificacao.';
        },
      });
  }
}
