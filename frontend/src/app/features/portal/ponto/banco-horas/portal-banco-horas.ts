import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  HourBank,
  HourBankMovement,
  PontoBancoHorasService,
} from '../../../ponto/banco-horas/ponto-banco-horas.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-banco-horas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-banco-horas.html',
  styleUrl: './portal-banco-horas.scss',
})
export class PortalBancoHoras implements OnInit {
  private readonly service = inject(PontoBancoHorasService);

  bank: HourBank | null = null;
  movements: HourBankMovement[] = [];
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const banks = await firstValueFrom(this.service.list());
      this.bank = banks.find((bank) => bank.status === 'ACTIVE') ?? banks[0] ?? null;
      this.movements = this.bank
        ? (await firstValueFrom(this.service.movements(this.bank.hourBankId))).slice(0, 90)
        : [];
    } catch {
      this.error = 'Nao foi possivel carregar o banco de horas.';
    }
  }
}
