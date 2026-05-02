import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ESocialCertificate, ESocialCertificatesService } from './esocial-certificates.service';

@Component({
  selector: 'app-esocial-certificados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './esocial-certificados.html',
  styleUrl: './esocial-certificados.scss',
})
export class ESocialCertificados implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly certificatesService = inject(ESocialCertificatesService);
  private readonly destroy$ = new Subject<void>();
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
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.certificatesService
      .list()
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (certificates) => (this.certificates = certificates),
        error: () => (this.error = 'Nao foi possivel carregar os certificados.'),
      });
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

  submit(): void {
    if (this.form.invalid || !this.pkcs12Base64) {
      this.error = 'Informe alias, tipo e arquivo PKCS#12.';
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

    request
      .pipe(
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.cancelRotation();
          this.load();
        },
        error: () => (this.error = 'Nao foi possivel salvar o certificado.'),
      });
  }
}
