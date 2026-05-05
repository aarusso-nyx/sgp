import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { FaceAdminService, FaceTemplateSummary } from './face-admin.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-face-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './face-admin.html',
  styleUrl: './face-admin.scss',
})
export class FaceAdmin implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(FaceAdminService);

  readonly enrollForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    frameOpenBase64: ['', [Validators.required]],
    frameBlinkBase64: ['', [Validators.required]],
    templateKmsKeyId: ['kms/ponto/face', [Validators.required]],
    consentVersion: ['ponto-face-lgpd-v1', [Validators.required]],
  });

  readonly thresholdForm = this.formBuilder.group({
    threshold: [0.7, [Validators.required, Validators.min(0), Validators.max(1)]],
    livenessRequired: [true],
  });

  templates: FaceTemplateSummary[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.loadThreshold();
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadThreshold(): void {
    this.service
      .threshold()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.thresholdForm.patchValue({
            threshold: Number(config.threshold),
            livenessRequired: config.livenessRequired,
          });
        },
      });
  }

  saveThreshold(): void {
    if (this.thresholdForm.invalid) return;
    this.saving = true;
    const value = this.thresholdForm.value;
    this.service
      .updateThreshold({
        threshold: Number(value.threshold),
        livenessRequired: Boolean(value.livenessRequired),
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m111;
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m112;
        },
      });
  }

  loadTemplates(): void {
    const employeeId = this.enrollForm.value.employeeId || undefined;
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
          this.error = SGP_FEATURE_I18N_MESSAGES.m113;
        },
      });
  }

  enroll(): void {
    if (this.enrollForm.invalid) {
      this.enrollForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    const value = this.enrollForm.value;
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
          this.error = SGP_FEATURE_I18N_MESSAGES.m114;
        },
      });
  }

  private captureTemplate(): void {
    const value = this.enrollForm.value;
    this.service
      .enroll({
        employeeId: value.employeeId,
        templateKmsKeyId: value.templateKmsKeyId,
        frames: [
          {
            imageBase64: value.frameOpenBase64,
            blinkDetected: false,
            yawDegrees: -10,
          },
          {
            imageBase64: value.frameBlinkBase64,
            blinkDetected: true,
            yawDegrees: 10,
          },
        ],
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (template) => {
          this.message = SGP_FEATURE_I18N_MESSAGES.m115(template.modelVersion);
          this.loadTemplates();
        },
        error: () => {
          this.error = SGP_FEATURE_I18N_MESSAGES.m116;
        },
      });
  }
}
