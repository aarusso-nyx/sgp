import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  DutyRoster,
  PontoEscalasService,
  RosterEntry,
  ShiftPattern,
} from './ponto-escalas.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ponto-escalas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ponto-escalas.html',
  styleUrl: './ponto-escalas.scss',
})
export class PontoEscalas implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly service = inject(PontoEscalasService);

  readonly rosterForm = this.formBuilder.group({
    employeeIds: ['', [Validators.required]],
    periodStart: [new Date().toISOString().slice(0, 10), [Validators.required]],
    periodEnd: [new Date().toISOString().slice(0, 8) + '28', [Validators.required]],
  });

  readonly portalForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
  });

  patterns: ShiftPattern[] = [];
  rosters: DutyRoster[] = [];
  upcoming: RosterEntry[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

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
      .listPatterns()
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (patterns) => {
          this.patterns = patterns;
          this.loadRosters();
        },
        error: () => {
          this.error = 'Nao foi possivel carregar escalas.';
        },
      });
  }

  create12x36(): void {
    this.saving = true;
    this.service
      .createDefault12x36()
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (pattern) => {
          this.message = `Escala ${pattern.code} criada.`;
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel criar a escala.';
        },
      });
  }

  generate(): void {
    if (this.rosterForm.invalid) {
      this.rosterForm.markAllAsTouched();
      return;
    }
    const value = this.rosterForm.value as Record<string, string>;
    this.saving = true;
    this.service
      .generateRoster({
        employeeIds: value['employeeIds']
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        periodStart: value['periodStart'],
        periodEnd: value['periodEnd'],
      })
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (roster) => {
          this.message = `Roster ${roster.status} gerado.`;
          this.loadRosters();
        },
        error: () => {
          this.error = 'Nao foi possivel gerar o roster.';
        },
      });
  }

  publish(roster: DutyRoster): void {
    this.service
      .publish(roster.dutyRosterId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadRosters(),
        error: () => {
          this.error = 'Nao foi possivel publicar o roster.';
        },
      });
  }

  lock(roster: DutyRoster): void {
    this.service
      .lock(roster.dutyRosterId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadRosters(),
        error: () => {
          this.error = 'Nao foi possivel travar o roster.';
        },
      });
  }

  loadUpcoming(): void {
    if (this.portalForm.invalid) {
      this.portalForm.markAllAsTouched();
      return;
    }
    const employeeId = String(this.portalForm.value.employeeId ?? '');
    this.service
      .upcoming(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entries) => {
          this.upcoming = entries;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar proximas escalas.';
        },
      });
  }

  private loadRosters(): void {
    this.service
      .listRosters()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rosters) => {
          this.rosters = rosters;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar rosters.';
        },
      });
  }
}
