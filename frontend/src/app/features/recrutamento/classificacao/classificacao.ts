import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ClassificationVersion {
  id: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  generatedAt: string;
  totalCandidates: number;
  published: boolean;
}

interface ClassificationRow {
  callOrder: number | null;
  rankGeneral: number;
  candidateName: string;
  totalScore: string;
  vaga: string;
  bucket: 'GENERAL' | 'PCD' | 'RACIAL' | 'INDIGENOUS';
}

@Component({
  selector: 'app-recrutamento-classificacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classificacao.html',
  styleUrl: './classificacao.scss',
})
export class RecrutamentoClassificacao {
  concursoId = '';
  selectedLeft = 'snap-2026-05-01';
  selectedRight = 'snap-2026-05-02';
  versions: ClassificationVersion[] = [
    {
      id: 'snap-2026-05-02',
      status: 'DRAFT',
      generatedAt: '2026-05-02 09:15',
      totalCandidates: 128,
      published: false,
    },
    {
      id: 'snap-2026-05-01',
      status: 'PUBLISHED',
      generatedAt: '2026-05-01 17:40',
      totalCandidates: 127,
      published: true,
    },
  ];
  rows: ClassificationRow[] = [
    {
      callOrder: 1,
      rankGeneral: 1,
      candidateName: 'Ana Souza',
      totalScore: '92.500000',
      vaga: 'Analista administrativo',
      bucket: 'GENERAL',
    },
    {
      callOrder: 2,
      rankGeneral: 2,
      candidateName: 'Bruno Lima',
      totalScore: '91.000000',
      vaga: 'Analista administrativo',
      bucket: 'GENERAL',
    },
    {
      callOrder: 3,
      rankGeneral: 12,
      candidateName: 'Carla Santos',
      totalScore: '86.000000',
      vaga: 'Analista administrativo',
      bucket: 'RACIAL',
    },
    {
      callOrder: 5,
      rankGeneral: 18,
      candidateName: 'Diego Alves',
      totalScore: '82.250000',
      vaga: 'Analista administrativo',
      bucket: 'PCD',
    },
  ];

  generate(): void {
    this.versions = [
      {
        id: `draft-${this.versions.length + 1}`,
        status: 'DRAFT',
        generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        totalCandidates: this.rows.length,
        published: false,
      },
      ...this.versions,
    ];
  }

  publish(version: ClassificationVersion): void {
    this.versions = this.versions.map((item) => ({
      ...item,
      status:
        item.id === version.id
          ? 'PUBLISHED'
          : item.status === 'PUBLISHED'
            ? 'SUPERSEDED'
            : item.status,
      published: item.id === version.id,
    }));
  }
}
