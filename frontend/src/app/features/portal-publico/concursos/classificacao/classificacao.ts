import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface PublicClassificationRow {
  callOrder: number | null;
  rankGeneral: number;
  candidateName: string;
  totalScore: string;
  bucket: 'GENERAL' | 'PCD' | 'RACIAL' | 'INDIGENOUS';
}

@Component({
  selector: 'app-portal-publico-classificacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classificacao.html',
  styleUrl: './classificacao.scss',
})
export class PortalPublicoClassificacao {
  slug = '';
  rows: PublicClassificationRow[] = [
    {
      callOrder: 1,
      rankGeneral: 1,
      candidateName: 'Ana Souza',
      totalScore: '92.500000',
      bucket: 'GENERAL',
    },
    {
      callOrder: 2,
      rankGeneral: 2,
      candidateName: 'Bruno Lima',
      totalScore: '91.000000',
      bucket: 'GENERAL',
    },
    {
      callOrder: 3,
      rankGeneral: 12,
      candidateName: 'Carla Santos',
      totalScore: '86.000000',
      bucket: 'RACIAL',
    },
  ];
}
