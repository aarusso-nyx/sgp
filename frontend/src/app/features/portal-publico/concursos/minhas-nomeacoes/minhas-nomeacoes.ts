import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';

interface PublicAppointment {
  concurso: string;
  ato: string;
  publishedAt: string;
  comparecimentoUntil: string;
  status: string;
  instructions: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-publico-minhas-nomeacoes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minhas-nomeacoes.html',
  styleUrl: './minhas-nomeacoes.scss',
})
export class PortalPublicoMinhasNomeacoes {
  appointments: PublicAppointment[] = [
    {
      concurso: 'Concurso 2026',
      ato: 'Portaria 54/2026',
      publishedAt: '2026-05-02',
      comparecimentoUntil: '2026-06-01',
      status: 'CONVOCADO',
      instructions: 'Comparecer ao setor de RH com documento oficial e comprovantes do edital.',
    },
  ];
}
