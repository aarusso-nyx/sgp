import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-transparencia-concursos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './concursos.html',
  styleUrl: './concursos.scss',
})
export class PortalTransparenciaConcursos {
  concursos = [
    {
      code: 'rec-2026',
      name: 'Concurso publico',
      validUntil: '2026-06-30',
      publicUrl: '/api/v1/publico/concursos/rec-2026',
    },
  ];
}
