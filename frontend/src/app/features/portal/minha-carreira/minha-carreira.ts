import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

interface CareerTrailStep {
  jobPositionName: string | null;
  classNumber: number;
  referenceNumber: number;
  baseSalary: string;
  current: boolean;
}

interface CareerTrail {
  name: string | null;
  current: CareerTrailStep | null;
  steps: CareerTrailStep[];
  salaryHistory: {
    vigenciaInicio: string;
    vigenciaFim: string | null;
    vencimentoBasico: string;
    motivo: string;
    leiReferencia: string;
  }[];
  nextProgression: {
    eligible: boolean;
    intersticeReferenceOn: string | null;
    approvedEvaluationId: string | null;
    nextLevel: {
      classNumber: number;
      levelNumber: number;
      salary: string;
    } | null;
  } | null;
}

interface VacationPayslip {
  payrollRunId: string;
  competenceYear: number;
  competenceMonth: number;
  status: string;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
}

interface TerminationTerm {
  payrollRunId: string;
  competenceYear: number;
  competenceMonth: number;
  status: string;
  terminationDate: string | null;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portal-minha-carreira',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minha-carreira.html',
  styleUrl: './minha-carreira.scss',
})
export class PortalMinhaCarreira implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly api = inject(ApiClient);

  trail?: CareerTrail;
  vacationPayslips: VacationPayslip[] = [];
  terminationTerms: TerminationTerm[] = [];
  error = '';

  ngOnInit(): void {
    this.api
      .get<CareerTrail>('/api/v1/portal/minha-carreira')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trail) => {
          this.trail = trail;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar a trilha de carreira.';
        },
      });
    this.api
      .get<VacationPayslip[]>('/api/v1/portal/contracheques/ferias')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payslips) => {
          this.vacationPayslips = payslips;
        },
        error: () => {
          this.vacationPayslips = [];
        },
      });
    this.api
      .get<TerminationTerm[]>('/api/v1/portal/termos-rescisao')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (terms) => {
          this.terminationTerms = terms;
        },
        error: () => {
          this.terminationTerms = [];
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
