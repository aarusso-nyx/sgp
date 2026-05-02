import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Step = 'personal' | 'position' | 'quota' | 'exemption' | 'confirm' | 'payment';

@Component({
  selector: 'app-portal-publico-inscricao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inscricao.html',
  styleUrl: './inscricao.scss',
})
export class PortalPublicoInscricao {
  step: Step = 'personal';
  steps: Step[] = ['personal', 'position', 'quota', 'exemption', 'confirm', 'payment'];
  consentOpen = true;
  lgpdConsentVersion = 'rec-02-v1';
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
  };

  acceptConsent(): void {
    this.form.lgpdConsent = true;
    this.consentOpen = false;
  }

  previous(): void {
    const index = this.steps.indexOf(this.step);
    this.step = this.steps[Math.max(index - 1, 0)];
  }

  next(): void {
    const index = this.steps.indexOf(this.step);
    this.step = this.steps[Math.min(index + 1, this.steps.length - 1)];
    if (this.step === 'payment' && !this.payment.pixQrCode) {
      this.payment = {
        pixQrCode: 'PIX sera exibido apos envio da inscricao',
        boletoBarcode: 'Codigo de barras sera exibido apos geracao da cobranca',
      };
    }
  }
}
