import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  PontoJustificativa,
  PontoJustificativasService,
} from '../../../ponto/justificativas/ponto-justificativas.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-justificativa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './portal-justificativa.html',
  styleUrl: './portal-justificativa.scss',
})
export class PortalJustificativa implements OnInit {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoJustificativasService);

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    requestedByUserId: ['', [Validators.required]],
    kind: ['MEDICAL', [Validators.required]],
    absenceStart: ['', [Validators.required]],
    absenceEnd: ['', [Validators.required]],
    attachmentId: [''],
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });

  requests: PontoJustificativa[] = [];
  saving = false;
  error = '';
  message = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.requests = await firstValueFrom(this.service.list());
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m153;
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value as {
      employeeId: string;
      requestedByUserId: string;
      kind: string;
      absenceStart: string;
      absenceEnd: string;
      attachmentId: string;
      reason: string;
    };
    this.saving = true;
    try {
      await firstValueFrom(
        this.service.request({
          employeeId: value.employeeId,
          requestedByUserId: value.requestedByUserId,
          kind: value.kind,
          absenceStart: value.absenceStart,
          absenceEnd: value.absenceEnd,
          reason: value.reason,
          ...(value.attachmentId ? { attachmentId: value.attachmentId } : {}),
          payrollTreatment: 'PAID',
        }),
      );
      this.message = SGP_FEATURE_I18N_MESSAGES.m154;
      this.form.patchValue({ reason: '', attachmentId: '' });
      await this.load();
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m155;
    } finally {
      this.saving = false;
    }
  }
}
