import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Step = 'personal' | 'position' | 'quota' | 'exemption' | 'biometrics' | 'confirm' | 'payment';

interface PublicRegistrationPayload {
  vagaId: string;
  candidate: {
    cpf: string;
    fullName: string;
    birthDate: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
    };
  };
  requirements: {
    education: string;
    professionalRegistry: string;
  };
  quotaSelfDeclaration?: Record<string, true>;
  exemption: {
    kind: string;
    evidenceRef?: string;
    nis?: string;
    donorRegistry?: string;
  };
  lgpdConsent: boolean;
  lgpdConsentVersion: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-publico-inscricao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inscricao.html',
  styleUrl: './inscricao.scss',
})
export class PortalPublicoInscricao {
  step: Step = 'personal';
  steps: Step[] = [
    'personal',
    'position',
    'quota',
    'exemption',
    'biometrics',
    'confirm',
    'payment',
  ];
  consentOpen = true;
  lgpdConsentVersion = 'rec-02-v1';
  biometricConsentVersion = 'rec-07-art11-v1';
  payment = {
    pixQrCode: '',
    boletoBarcode: '',
  };
  form = {
    cpf: '',
    fullName: '',
    birthDate: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    vagaId: '',
    education: '',
    professionalRegistry: '',
    quota: '',
    exemptionKind: 'NONE',
    exemptionEvidence: '',
    nis: '',
    donorRegistry: '',
    lgpdConsent: false,
    biometricConsent: false,
    fingerprintQuality: 0,
    faceQuality: 0,
  };

  acceptConsent(): void {
    this.form.lgpdConsent = true;
    this.consentOpen = false;
  }

  acceptBiometricConsent(): void {
    this.form.biometricConsent = true;
  }

  captureFingerprint(): void {
    this.form.fingerprintQuality = 0.91;
  }

  captureFace(): void {
    this.form.faceQuality = 0.87;
  }

  previous(): void {
    const index = this.steps.indexOf(this.step);
    this.step = this.steps[Math.max(index - 1, 0)] ?? this.steps[0]!;
  }

  next(): void {
    const index = this.steps.indexOf(this.step);
    this.step = this.steps[Math.min(index + 1, this.steps.length - 1)] ?? this.steps[0]!;
    if (this.step === 'payment' && !this.payment.pixQrCode) {
      this.payment = {
        pixQrCode: 'PIX sera exibido apos envio da inscricao',
        boletoBarcode: 'Codigo de barras sera exibido apos geracao da cobranca',
      };
    }
  }

  canSubmitPublicRegistration(): boolean {
    return this.form.lgpdConsent && this.lgpdConsentVersion.trim().length > 0;
  }

  buildPublicRegistrationPayload(): PublicRegistrationPayload {
    const payload: PublicRegistrationPayload = {
      vagaId: this.form.vagaId.trim(),
      candidate: {
        cpf: this.form.cpf.trim(),
        fullName: this.form.fullName.trim(),
        birthDate: this.form.birthDate,
        email: this.form.email.trim(),
        phone: this.form.phone.trim(),
        address: {
          street: this.form.street.trim(),
          city: this.form.city.trim(),
          state: this.form.state.trim().toUpperCase(),
          postalCode: this.form.postalCode.trim(),
        },
      },
      requirements: {
        education: this.form.education.trim(),
        professionalRegistry: this.form.professionalRegistry.trim(),
      },
      exemption: this.buildExemptionPayload(),
      lgpdConsent: this.form.lgpdConsent,
      lgpdConsentVersion: this.lgpdConsentVersion,
    };

    if (this.form.quota) {
      payload.quotaSelfDeclaration = { [this.form.quota]: true };
    }

    return payload;
  }

  private buildExemptionPayload(): PublicRegistrationPayload['exemption'] {
    const exemption: PublicRegistrationPayload['exemption'] = {
      kind: this.form.exemptionKind,
    };
    if (this.form.exemptionEvidence.trim()) {
      exemption.evidenceRef = this.form.exemptionEvidence.trim();
    }
    if (this.form.nis.trim()) {
      exemption.nis = this.form.nis.trim();
    }
    if (this.form.donorRegistry.trim()) {
      exemption.donorRegistry = this.form.donorRegistry.trim();
    }
    return exemption;
  }
}
