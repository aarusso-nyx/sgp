import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-portal-banca-verify',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banca-verify.html',
  styleUrl: './banca-verify.scss',
})
export class PortalBancaVerify {
  verification = {
    kind: 'GABARITO',
    status: 'PUBLISHED',
    valid: true,
    contentHash: 'a'.repeat(64),
    signers: [
      {
        name: 'Presidente da Banca',
        role: 'PRESIDENTE',
        certKind: 'ICP_A1',
        chainStatus: 'VALID',
      },
    ],
  };
}
