import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface PossessionAgendaItem {
  candidateName: string;
  nomeacaoId: string;
  posseAt: string;
  exercicioDueAt: string;
  lotacao: string;
  status: 'AGENDADA' | 'POSSE_REALIZADA' | 'EXERCICIO' | 'PRORROGADA' | 'CANCELADA';
  employeeRegistration?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-recrutamento-posse',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './posse.html',
  styleUrl: './posse.scss',
})
export class RecrutamentoPosse {
  nomeacaoId = '';
  posseAt = '2026-06-03T09:00';
  lotacaoId = '';
  lotacaoLabel = 'Secretaria de Administracao';
  reason = '';

  agenda: PossessionAgendaItem[] = [
    {
      candidateName: 'Ana Souza',
      nomeacaoId: '00000000-0000-4000-8000-000000000503',
      posseAt: '2026-06-03T09:00',
      exercicioDueAt: '2026-06-24',
      lotacao: 'Secretaria de Administracao',
      status: 'AGENDADA',
    },
  ];

  schedule(): void {
    if (!this.nomeacaoId || !this.lotacaoId) return;
    this.agenda = [
      {
        candidateName: 'Candidato nomeado',
        nomeacaoId: this.nomeacaoId,
        posseAt: this.posseAt,
        exercicioDueAt: this.businessDate(this.posseAt, 15),
        lotacao: this.lotacaoLabel || this.lotacaoId,
        status: 'AGENDADA',
      },
      ...this.agenda,
    ];
    this.nomeacaoId = '';
  }

  markPossession(item: PossessionAgendaItem): void {
    if (item.status === 'AGENDADA' || item.status === 'PRORROGADA') {
      item.status = 'POSSE_REALIZADA';
    }
  }

  startExercise(item: PossessionAgendaItem): void {
    if (item.status === 'POSSE_REALIZADA' || item.status === 'PRORROGADA') {
      item.status = 'EXERCICIO';
      item.employeeRegistration = `REC-${item.nomeacaoId.slice(0, 8)}`;
    }
  }

  prorogue(item: PossessionAgendaItem): void {
    if (item.status !== 'EXERCICIO' && item.status !== 'CANCELADA') {
      item.status = 'PRORROGADA';
      item.exercicioDueAt = this.businessDate(item.exercicioDueAt, 15);
    }
  }

  cancel(item: PossessionAgendaItem): void {
    if (item.status !== 'EXERCICIO' && this.reason.trim()) {
      item.status = 'CANCELADA';
    }
  }

  private businessDate(value: string, days: number): string {
    const date = new Date(value);
    let added = 0;
    while (added < days) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 0 && day !== 6) added += 1;
    }
    return date.toISOString().slice(0, 10);
  }
}
