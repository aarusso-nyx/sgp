import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { PontoMobileService } from './ponto-mobile.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ponto-mobile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-mobile.html',
  styleUrl: './ponto-mobile.scss',
})
export class PontoMobile {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoMobileService);

  readonly form = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    deviceId: ['', [Validators.required]],
    publicKey: ['', [Validators.required]],
    platform: ['ANDROID', [Validators.required]],
    consentVersion: ['ponto-mobile-geolocalizacao-v1', [Validators.required]],
  });

  saving = false;
  clocking = false;
  message = '';
  error = '';
  distanceM: number | null = null;

  registerDevice(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    this.saving = true;
    this.error = '';
    this.service
      .registerDevice({
        employeeId: value.employeeId,
        deviceId: value.deviceId,
        platform: value.platform,
        publicKey: value.publicKey,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => (this.message = 'Dispositivo registrado.'),
        error: () => (this.error = 'Nao foi possivel registrar o dispositivo.'),
      });
  }

  createConsent(): void {
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
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => (this.message = 'Consentimento registrado.'),
        error: () => (this.error = 'Nao foi possivel registrar o consentimento.'),
      });
  }

  clock(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!navigator.geolocation) {
      this.error = 'Geolocalizacao indisponivel neste navegador.';
      return;
    }
    this.clocking = true;
    this.error = '';
    navigator.geolocation.getCurrentPosition(
      (position) => this.submitClock(position),
      () => {
        this.clocking = false;
        this.error = 'Nao foi possivel capturar a localizacao.';
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  private submitClock(position: GeolocationPosition): void {
    const value = this.form.value;
    this.service
      .clock({
        employeeId: value.employeeId,
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        gpsPrecisionM: position.coords.accuracy,
        occurredAt: new Date().toISOString(),
        mockLocation: false,
        deviceId: value.deviceId,
        platform: value.platform,
      })
      .pipe(finalize(() => (this.clocking = false)))
      .subscribe({
        next: (result) => {
          this.distanceM = result.distanceM ?? null;
          this.message = `Resultado ${result.result}; protocolo ${result.attemptId}.`;
        },
        error: () => (this.error = 'Nao foi possivel registrar a batida.'),
      });
  }
}
