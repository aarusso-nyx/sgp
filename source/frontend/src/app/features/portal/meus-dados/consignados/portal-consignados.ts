import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import {
  ConsignadosService,
  ConsignmentLoan,
  ConsignmentMargin,
} from '../../../folha-pagamento/consignados/consignados.service';

@Component({
  selector: 'app-portal-consignados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-consignados.html',
  styleUrl: './portal-consignados.scss',
})
export class PortalConsignados implements OnInit {
  private readonly service = inject(ConsignadosService);
  private readonly competence = new Date().toISOString().slice(0, 7);

  margin?: ConsignmentMargin;
  loans: ConsignmentLoan[] = [];
  errorMessage = '';

  ngOnInit(): void {
    const employeeId = 'me';
    this.service.margin(employeeId, this.competence).subscribe({
      next: (margin) => {
        this.margin = margin;
      },
      error: () => {
        this.errorMessage = 'Nao foi possivel carregar a margem consignavel.';
      },
    });
    this.service.loans(employeeId).subscribe({
      next: (loans) => {
        this.loans = loans;
      },
      error: () => {
        this.loans = [];
      },
    });
  }
}
