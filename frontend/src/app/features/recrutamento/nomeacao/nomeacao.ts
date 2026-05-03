import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface NextCall {
  vaga: string;
  nextOrder: number;
  candidateName: string;
  bucket: 'GENERAL' | 'PCD' | 'RACIAL' | 'INDIGENOUS';
  deadline: string;
}

interface AppointmentNotice {
  candidateName: string;
  ato: string;
  actClassificationCode: string;
  status: 'NOMEADO' | 'CONVOCADO' | 'DESISTENTE' | 'EXONERADO_POR_NAO_POSSE';
  channel: 'PUBLICACAO_OFICIAL' | 'EMAIL' | 'POSTAL';
  evidenceRef: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-recrutamento-nomeacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nomeacao.html',
  styleUrl: './nomeacao.scss',
})
export class RecrutamentoNomeacao {
  concursoId = '';
  atoAdministrativo = 'Portaria 54/2026';
  actClassificationCode = 'NOMEACAO';
  emailEnabled = true;
  nextCalls: NextCall[] = [
    {
      vaga: 'Analista administrativo',
      nextOrder: 4,
      candidateName: 'Daniela Rocha',
      bucket: 'GENERAL',
      deadline: '2026-06-01',
    },
    {
      vaga: 'Tecnico legislativo',
      nextOrder: 3,
      candidateName: 'Carlos Mendes',
      bucket: 'RACIAL',
      deadline: '2026-06-01',
    },
  ];
  notices: AppointmentNotice[] = [
    {
      candidateName: 'Ana Souza',
      ato: 'Portaria 51/2026',
      actClassificationCode: 'NOMEACAO',
      status: 'CONVOCADO',
      channel: 'EMAIL',
      evidenceRef: 'email:messageId=local-ana',
    },
  ];

  appoint(call: NextCall): void {
    this.notices = [
      {
        candidateName: call.candidateName,
        ato: this.atoAdministrativo,
        actClassificationCode: this.actClassificationCode,
        status: this.emailEnabled ? 'CONVOCADO' : 'NOMEADO',
        channel: this.emailEnabled ? 'EMAIL' : 'PUBLICACAO_OFICIAL',
        evidenceRef: this.emailEnabled ? 'email:messageId=pending' : this.atoAdministrativo,
      },
      ...this.notices,
    ];
    this.nextCalls = this.nextCalls.filter((item) => item !== call);
  }

  withdraw(notice: AppointmentNotice): void {
    notice.status = 'DESISTENTE';
  }
}
