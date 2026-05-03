import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-recrutamento-biometria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './biometria.html',
  styleUrl: './biometria.scss',
})
export class RecrutamentoBiometria {
  search = {
    candidatoId: '',
    examSessionId: '',
    deviceRef: 'leitor-banca',
  };
  result = {
    score: '0.000000',
    decision: 'PENDING',
    threshold: '0.700000',
  };

  runMatch(): void {
    this.result = {
      score: this.search.candidatoId ? '0.912000' : '0.000000',
      decision: this.search.candidatoId ? 'ACCEPT' : 'REJECT',
      threshold: '0.700000',
    };
  }
}
