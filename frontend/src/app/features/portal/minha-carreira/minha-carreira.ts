import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
export class PortalMinhaCarreira implements OnInit {
  private readonly api = inject(ApiClient);

  trail?: CareerTrail;
  vacationPayslips: VacationPayslip[] = [];
  terminationTerms: TerminationTerm[] = [];
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const [trail, vacationPayslips, terminationTerms] = await Promise.allSettled([
      firstValueFrom(this.api.get<CareerTrail>('/api/v1/portal/minha-carreira')),
      firstValueFrom(this.api.get<VacationPayslip[]>('/api/v1/portal/contracheques/ferias')),
      firstValueFrom(this.api.get<TerminationTerm[]>('/api/v1/portal/termos-rescisao')),
    ]);

    if (trail.status === 'fulfilled') {
      this.trail = trail.value;
    } else {
      this.error = 'Nao foi possivel carregar a trilha de carreira.';
    }

    this.vacationPayslips = vacationPayslips.status === 'fulfilled' ? vacationPayslips.value : [];
    this.terminationTerms = terminationTerms.status === 'fulfilled' ? terminationTerms.value : [];
  }
}
