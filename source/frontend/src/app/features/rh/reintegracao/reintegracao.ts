import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { ReintegrationOrder, ReintegracaoService } from './reintegracao.service';

@Component({
  selector: 'sgp-rh-reintegracao',
  templateUrl: './reintegracao.html',
  styleUrl: './reintegracao.scss',
  standalone: false,
})
export class RhReintegracao {
  savedOrder?: ReintegrationOrder;
  appliedOrder?: ReintegrationOrder;
  transmission?: Record<string, unknown>;
  saving = false;
  applying = false;
  transmitting = false;
  error = '';

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ReintegracaoService);

  readonly form = this.fb.group({
    employmentLinkId: ['', Validators.required],
    reinstatementDate: ['', Validators.required],
    terminationDate: ['', Validators.required],
    kind: ['JUDICIAL', Validators.required],
    processNumber: [''],
    court: [''],
    decisionDate: ['', Validators.required],
    attachmentUri: [''],
    originalTerminationEventId: ['', Validators.required],
    originalS2299Receipt: [''],
  });

  readonly xmlPreview = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial>
  <evtReintegr>
    <ideEvento><nrRecibo>...</nrRecibo></ideEvento>
    <infoReintegr><tpReint>...</tpReint><dtEfetRetorno>...</dtEfetRetorno></infoReintegr>
  </evtReintegr>
</eSocial>`;

  get clientSideInvalid(): boolean {
    const value = this.form.getRawValue();
    if (!value.reinstatementDate) return false;
    const today = dateOnly(new Date());
    if (value.reinstatementDate > today) return true;
    if (!value.terminationDate) return false;
    return value.reinstatementDate < value.terminationDate;
  }

  save(): void {
    if (this.form.invalid || this.clientSideInvalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving = true;
    this.error = '';
    this.appliedOrder = undefined;
    this.transmission = undefined;
    this.service
      .register({
        employmentLinkId: value.employmentLinkId ?? '',
        reinstatementDate: value.reinstatementDate ?? '',
        kind: value.kind ?? 'JUDICIAL',
        processNumber: optional(value.processNumber),
        court: optional(value.court),
        decisionDate: value.decisionDate ?? '',
        attachmentUri: optional(value.attachmentUri),
        originalTerminationEventId: optional(value.originalTerminationEventId),
        originalS2299Receipt: optional(value.originalS2299Receipt),
      })
      .subscribe({
        next: (order) => {
          this.savedOrder = order;
          this.saving = false;
        },
        error: (error: { message?: string }) => {
          this.error = error.message ?? 'Falha ao registrar reintegracao.';
          this.saving = false;
        },
      });
  }

  apply(): void {
    if (!this.savedOrder) return;
    this.applying = true;
    this.error = '';
    this.service.apply(this.savedOrder.id).subscribe({
      next: (order) => {
        this.appliedOrder = order;
        this.savedOrder = order;
        this.applying = false;
      },
      error: (error: { message?: string }) => {
        this.error = error.message ?? 'Falha ao aplicar reintegracao.';
        this.applying = false;
      },
    });
  }

  transmit(): void {
    const orderId = this.appliedOrder?.id ?? this.savedOrder?.id;
    if (!orderId) return;
    this.transmitting = true;
    this.error = '';
    this.service.transmit(orderId).subscribe({
      next: (result) => {
        this.transmission = result;
        this.transmitting = false;
      },
      error: (error: { message?: string }) => {
        this.error = error.message ?? 'Falha ao transmitir S-2298.';
        this.transmitting = false;
      },
    });
  }
}

function optional(value: string | null | undefined): string | undefined {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
