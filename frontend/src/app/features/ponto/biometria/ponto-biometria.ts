import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { BiometricTemplateSummary, PontoBiometriaService } from './ponto-biometria.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ponto-biometria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-biometria.html',
  styleUrl: './ponto-biometria.scss',
})
export class PontoBiometria implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoBiometriaService);

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    kind: ['FINGERPRINT', [Validators.required]],
    sampleBase64: ['', [Validators.required]],
    templateKmsKeyId: ['kms/ponto/rep-a', [Validators.required]],
    minimumQuality: [0.85, [Validators.required]],
    consentVersion: ['ponto-biometria-v1', [Validators.required]],
  });

  templates: BiometricTemplateSummary[] = [];
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
    const employeeId = this.form.value.employeeId || undefined;
    this.loading = true;
    this.service
      .listTemplates(employeeId)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (templates) => {
          this.templates = templates;
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m098;
        },
      });
  }

  enroll(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    this.saving = true;
    this.error = '';
    this.service
      .createConsent({
        employeeId: value.employeeId,
        consentVersion: value.consentVersion,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.captureTemplate(),
        error: () => {
          this.saving = false;
          this.error = SGP_FEATURE_I18N_MESSAGES.m099;
        },
      });
  }

  private captureTemplate(): void {
    const value = this.form.value;
    this.service
      .enroll({
        employeeId: value.employeeId,
        kind: value.kind,
        sampleBase64: value.sampleBase64,
        templateKmsKeyId: value.templateKmsKeyId,
        minimumQuality: Number(value.minimumQuality),
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (template) => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m100(template.kind, template.qualityScore);
          this.load();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m101;
        },
      });
  }
}
