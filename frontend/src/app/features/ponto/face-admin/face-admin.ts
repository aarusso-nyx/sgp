import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { FaceAdminService, FaceTemplateSummary } from './face-admin.service';

@Component({
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
          this.message = 'Threshold atualizado.';
        },
        error: () => {
          this.error = 'Nao foi possivel atualizar o threshold.';
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
          this.error = 'Nao foi possivel carregar os templates faciais.';
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
          this.error = 'Nao foi possivel registrar consentimento facial.';
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
          this.message = `Template facial ${template.modelVersion} cadastrado.`;
          this.loadTemplates();
        },
        error: () => {
          this.error = 'Nao foi possivel cadastrar o template facial.';
        },
      });
  }
}
