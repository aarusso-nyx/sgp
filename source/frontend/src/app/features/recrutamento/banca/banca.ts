import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface BoardMemberDraft {
  fullName: string;
  cpf: string;
  role: 'PRESIDENTE' | 'MEMBRO' | 'SECRETARIO';
  certKind: 'ICP_A1' | 'ICP_A3' | 'GOVBR_OURO' | 'GOVBR_PRATA';
}

@Component({
  selector: 'app-recrutamento-banca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './banca.html',
  styleUrl: './banca.scss',
})
export class RecrutamentoBanca {
  view: 'members' | 'signing' | 'publish' = 'members';
  member: BoardMemberDraft = {
    fullName: '',
    cpf: '',
    role: 'MEMBRO',
    certKind: 'ICP_A1',
  };
  pendingDocuments = [
    {
      kind: 'GABARITO',
      sourceRef: 'gabarito-final-001',
      status: 'PARTIALLY_SIGNED',
      signed: 2,
      required: 3,
    },
  ];

  setView(view: 'members' | 'signing' | 'publish'): void {
    this.view = view;
  }
}
