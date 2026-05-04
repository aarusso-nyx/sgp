import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  ConsignadosService,
  ConsignmentLoan,
  ConsignmentMargin,
} from '../../../folha-pagamento/consignados/consignados.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    void this.load();
  }

  private async load(): Promise<void> {
    const employeeId = 'me';
    const [margin, loans] = await Promise.allSettled([
      firstValueFrom(this.service.margin(employeeId, this.competence)),
      firstValueFrom(this.service.loans(employeeId)),
    ]);

    if (margin.status === 'fulfilled') {
      this.margin = margin.value;
    } else {
      this.errorMessage = 'Nao foi possivel carregar a margem consignavel.';
    }

    this.loans = loans.status === 'fulfilled' ? loans.value : [];
  }
}
