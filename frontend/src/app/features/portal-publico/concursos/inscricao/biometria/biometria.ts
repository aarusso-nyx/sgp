import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-portal-publico-biometria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './biometria.html',
  styleUrl: './biometria.scss',
})
export class PortalPublicoBiometria {
  consentVersion = 'rec-07-art11-v1';
  consentAccepted = false;
  fingerprintQuality = 0;
  faceQuality = 0;
  deletionRequested = false;
  capture = {
    deviceRef: 'leitor-local',
    faceDeviceRef: 'camera-local',
    retentionUntil: '',
  };

  acceptConsent(): void {
    this.consentAccepted = true;
  }

  simulateFingerprintCapture(): void {
    this.fingerprintQuality = 0.92;
  }

  simulateFaceCapture(): void {
    this.faceQuality = 0.88;
  }

  requestDeletion(): void {
    this.deletionRequested = true;
  }
}
