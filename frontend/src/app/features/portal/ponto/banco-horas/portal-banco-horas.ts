import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { EMPTY, Subject, switchMap, takeUntil } from 'rxjs';

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
export class PortalBancoHoras implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly service = inject(PontoBancoHorasService);

  bank: HourBank | null = null;
  movements: HourBankMovement[] = [];
  error = '';

  ngOnInit(): void {
    this.service
      .list()
      .pipe(
        switchMap((banks) => {
          this.bank = banks.find((bank) => bank.status === 'ACTIVE') ?? banks[0] ?? null;
          if (!this.bank) return EMPTY;
          return this.service.movements(this.bank.hourBankId);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (movements) => {
          this.movements = movements.slice(0, 90);
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o banco de horas.';
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
