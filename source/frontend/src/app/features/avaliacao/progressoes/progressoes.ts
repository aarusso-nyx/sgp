import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';

interface ProgressionRecord {
  id: string;
  registration: string | null;
  name: string | null;
  progressionType: string;
  status: string;
  effectDate: string;
  sourceSalary: string | null;
  targetSalary: string | null;
}

interface ProgressionSimulationResult {
  progressionId: string;
  simulationId: string;
  sourceSalary: string;
  targetSalary: string;
  netDelta: string;
}

@Component({
  selector: 'app-avaliacao-progressoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule],
  templateUrl: './progressoes.html',
  styleUrl: './progressoes.scss',
})
export class AvaliacaoProgressoes implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly http = inject(HttpClient);

  readonly filters = ['eligible', 'simulated', 'applied'] as const;
  readonly simulationForm = this.formBuilder.group({
    employeeId: ['', [Validators.required]],
    effectDate: ['', [Validators.required]],
    progressionType: ['merit_horizontal', [Validators.required]],
    targetSalaryRangeLevelId: [''],
    earningDeductionId: [''],
    appointmentAct: [''],
    justification: [''],
  });

  records: ProgressionRecord[] = [];
  selectedStatus = 'simulated';
  simulation?: ProgressionSimulationResult;
  loading = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(status = this.selectedStatus): void {
    this.selectedStatus = status;
    this.loading = true;
    this.http
      .get<ProgressionRecord[]>('/api/v1/avaliacao/progression', {
        params: { status },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (records) => {
          this.records = records;
          this.loading = false;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar as progressoes.';
          this.loading = false;
        },
      });
  }

  simulate(): void {
    if (this.simulationForm.invalid) {
      this.simulationForm.markAllAsTouched();
      return;
    }
    const value = this.simulationForm.getRawValue();
    const payload = {
      employeeId: value.employeeId,
      effectDate: value.effectDate,
      progressionType: value.progressionType,
      targetSalaryRangeLevelId: value.targetSalaryRangeLevelId || undefined,
      earningDeductionId: value.earningDeductionId || undefined,
      appointmentAct: value.appointmentAct || undefined,
      justification: value.justification || undefined,
    };
    this.http
      .post<ProgressionSimulationResult>('/api/v1/avaliacao/progression/simulate', payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.simulation = result;
          this.message = 'Simulacao registrada.';
          this.load('simulated');
        },
        error: () => {
          this.error = 'Nao foi possivel simular a progressao.';
        },
      });
  }

  apply(record: ProgressionRecord): void {
    const firstConfirmation = window.confirm('Confirmar aplicacao da progressao?');
    if (!firstConfirmation) return;
    const secondConfirmation = window.confirm('A aplicacao atualiza o nivel salarial vigente.');
    if (!secondConfirmation) return;

    this.http
      .post(`/api/v1/avaliacao/progression/${record.id}/apply`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.message = 'Progressao aplicada.';
          this.load(this.selectedStatus);
        },
        error: () => {
          this.error = 'Nao foi possivel aplicar a progressao.';
        },
      });
  }
}
