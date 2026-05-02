import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Subject, finalize, map, takeUntil } from 'rxjs';

import { OpenApiClient } from '../../../core/api/generated/openapi-client';

interface ProbationDueEmployee {
  funcionarioId: string;
  matricula: string;
  nome: string;
  exercicioEm: string;
  completaEm: string;
  diasParaConclusao: number;
}

@Component({
  selector: 'app-avaliacao-estagio-probatorio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule],
  templateUrl: './estagio-probatorio.html',
  styleUrl: './estagio-probatorio.scss',
})
export class AvaliacaoEstagioProbatorio implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly formBuilder = inject(UntypedFormBuilder);

  readonly evaluationForm = this.formBuilder.group({
    funcionarioId: ['', [Validators.required]],
    periodoInicio: ['', [Validators.required]],
    periodoFim: ['', [Validators.required]],
    nota: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
    decisao: ['pending', [Validators.required]],
    avaliadorId: [''],
    observacao: [''],
  });

  employees: ProbationDueEmployee[] = [];
  loading = false;
  saving = false;
  error = '';
  message = '';

  constructor(private readonly api: OpenApiClient) {}

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
    this.api
      .getApiV1AvaliacaoEstagioProbatorioAVencer()
      .pipe(
        map((result) => (Array.isArray(result) ? (result as ProbationDueEmployee[]) : [])),
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (employees) => {
          this.employees = employees;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar o estagio probatorio.';
        },
      });
  }

  select(employee: ProbationDueEmployee): void {
    this.evaluationForm.patchValue({ funcionarioId: employee.funcionarioId });
  }

  submit(): void {
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.api
      .postApiV1AvaliacaoEstagioProbatorio(this.compact(this.evaluationForm.value))
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = 'Avaliacao registrada.';
          this.evaluationForm.reset({ decisao: 'pending' });
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel registrar a avaliacao.';
        },
      });
  }

  private compact(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, entry]) => entry !== null && entry !== undefined && entry !== '',
      ),
    );
  }
}
