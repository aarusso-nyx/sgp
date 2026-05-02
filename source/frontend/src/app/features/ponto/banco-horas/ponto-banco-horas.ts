import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  HourBank,
  HourBankMovement,
  PontoBancoHorasService,
} from './ponto-banco-horas.service';

@Component({
  selector: 'app-ponto-banco-horas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-banco-horas.html',
  styleUrl: './ponto-banco-horas.scss',
})
export class PontoBancoHoras implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoBancoHorasService);

  readonly adjustmentForm = this.formBuilder.group({
    hourBankId: ['', [Validators.required]],
    workDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    minutes: [0, [Validators.required]],
  });

  banks: HourBank[] = [];
  movements: HourBankMovement[] = [];
  selectedBankId = '';
  loading = false;
  saving = false;
  error = '';
  message = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service
      .list()
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (banks) => {
          this.banks = banks;
          if (banks.length > 0 && !this.selectedBankId) {
            this.select(banks[0]);
          }
        },
        error: () => {
          this.error = 'Nao foi possivel carregar bancos de horas.';
        },
      });
  }

  select(bank: HourBank): void {
    this.selectedBankId = bank.hourBankId;
    this.adjustmentForm.patchValue({ hourBankId: bank.hourBankId });
    this.service
      .movements(bank.hourBankId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (movements) => {
          this.movements = movements;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o extrato.';
        },
      });
  }

  saveAdjustment(): void {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }
    const value = this.adjustmentForm.value as {
      hourBankId: string;
      workDate: string;
      minutes: number;
    };
    this.saving = true;
    this.service
      .adjust({
        hourBankId: value.hourBankId,
        workDate: value.workDate,
        minutes: Number(value.minutes),
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = 'Ajuste registrado.';
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel registrar o ajuste.';
        },
      });
  }
}
