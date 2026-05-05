import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { FgtsRemessasService, FgtsRemittance } from './fgts-remessas.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-fgts-remessas',
  standalone: false,
  templateUrl: './fgts-remessas.html',
  styleUrl: './fgts-remessas.scss',
})
export class FgtsRemessas {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(FgtsRemessasService);

  private readonly current = new Date();
  readonly form = this.fb.nonNullable.group({
    competence: [
      `${this.current.getFullYear()}-${String(this.current.getMonth() + 1).padStart(2, '0')}`,
      Validators.required,
    ],
    employmentLinkId: [''],
    terminationId: [''],
    remittanceId: [''],
  });

  remittance: FgtsRemittance | null = null;
  errorMessage = '';
  loading = false;

  generateMonthly(): void {
    if (!this.form.controls.competence.value) {
      this.form.controls.competence.markAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.service.generateMonthly(this.form.controls.competence.value).subscribe({
      next: (remittance) => this.setRemittance(remittance),
      error: (error: unknown) => this.setError(error, SGP_FEATURE_I18N_MESSAGES.m045),
    });
  }

  generateTermination(): void {
    const employmentLinkId = this.form.controls.employmentLinkId.value.trim();
    const terminationId = this.form.controls.terminationId.value.trim();
    if (!employmentLinkId || !terminationId) {
      this.form.controls.employmentLinkId.markAsTouched();
      this.form.controls.terminationId.markAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.service.generateTermination({ employmentLinkId, terminationId }).subscribe({
      next: (remittance) => this.setRemittance(remittance),
      error: (error: unknown) => this.setError(error, SGP_FEATURE_I18N_MESSAGES.m046),
    });
  }

  load(): void {
    const id = this.form.controls.remittanceId.value.trim();
    if (!id) {
      this.form.controls.remittanceId.markAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.service.find(id).subscribe({
      next: (remittance) => this.setRemittance(remittance),
      error: (error: unknown) => this.setError(error, SGP_FEATURE_I18N_MESSAGES.m047),
    });
  }

  download(): void {
    if (!this.remittance?.fileContentBase64) return;
    const binary = window.atob(this.remittance.fileContentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.remittance.id}.sifge`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private setRemittance(remittance: FgtsRemittance): void {
    this.remittance = remittance;
    this.loading = false;
  }

  private setError(error: unknown, fallback: string): void {
    this.errorMessage = error instanceof Error ? error.message : fallback;
    this.loading = false;
  }
}
