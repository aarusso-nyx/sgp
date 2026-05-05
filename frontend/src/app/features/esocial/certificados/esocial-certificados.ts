import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ESocialCertificate, ESocialCertificatesService } from './esocial-certificates.service';
import { SGP_FEATURE_I18N_MESSAGES } from '../../../core/i18n/feature-messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esocial-certificados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './esocial-certificados.html',
  styleUrl: './esocial-certificados.scss',
})
export class ESocialCertificados implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly certificatesService = inject(ESocialCertificatesService);
  private pkcs12Base64 = '';
  rotatingCertificateId = '';
  certificates: ESocialCertificate[] = [];
  loading = false;
  saving = false;
  error = '';

  form = this.formBuilder.nonNullable.group({
    alias: ['', [Validators.required, Validators.maxLength(80)]],
    kind: ['A1' as 'A1' | 'A3', Validators.required],
    password: [''],
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.certificates = await firstValueFrom(this.certificatesService.list());
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m023;
    } finally {
      this.loading = false;
    }
  }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.pkcs12Base64 = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? '');
      this.pkcs12Base64 = value.includes(',') ? value.split(',')[1] : value;
    };
    reader.readAsDataURL(file);
  }

  startRotation(certificate: ESocialCertificate): void {
    this.rotatingCertificateId = certificate.certificateId;
    this.form.patchValue({ alias: certificate.alias, kind: certificate.kind, password: '' });
    this.pkcs12Base64 = '';
  }

  cancelRotation(): void {
    this.rotatingCertificateId = '';
    this.form.reset({ alias: '', kind: 'A1', password: '' });
    this.pkcs12Base64 = '';
  }

  async submit(): Promise<void> {
    if (this.form.invalid || !this.pkcs12Base64) {
      this.error = SGP_FEATURE_I18N_MESSAGES.m024;
      return;
    }

    this.saving = true;
    this.error = '';
    const raw = this.form.getRawValue();
    const payload = {
      alias: raw.alias,
      kind: raw.kind,
      pkcs12Base64: this.pkcs12Base64,
      password: raw.password || undefined,
    };
    const request = this.rotatingCertificateId
      ? this.certificatesService.rotate(this.rotatingCertificateId, payload)
      : this.certificatesService.upload(payload);

    try {
      await firstValueFrom(request);
      this.cancelRotation();
      await this.load();
    } catch {
      this.error = SGP_FEATURE_I18N_MESSAGES.m025;
    } finally {
      this.saving = false;
    }
  }
}
