import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-publico-minhas-notas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './minhas-notas.html',
  styleUrl: './minhas-notas.scss',
})
export class PortalPublicoMinhasNotas {
  lookup = {
    inscricaoId: '',
    token: '',
  };
  recurso = {
    provaId: '',
    questaoId: '',
    reason: '',
  };
}
