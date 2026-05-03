import { Injectable } from '@nestjs/common';

export type AtividadeRiscoProfessorGender = 'FEMALE' | 'MALE';
export type AtividadeRiscoProfessorPopulation = 'RISK_ACTIVITY' | 'TEACHER';

export interface AtividadeRiscoProfessorInput {
  population: AtividadeRiscoProfessorPopulation;
  gender: AtividadeRiscoProfessorGender;
  birthDate: Date | string | null;
  referenceDate: Date | string;
  contributionStartDate: Date | string | null;
  publicServiceStartDate?: Date | string | null;
  currentPositionStartDate?: Date | string | null;
  careerStartDate?: Date | string | null;
  teachingStartDate?: Date | string | null;
  contributionYearsAtReform?: number;
  careerYearsAtReform?: number;
  enteredCareerByReform?: boolean;
}

export interface AtividadeRiscoProfessorResult {
  rule: 'EC103_ATIVIDADE_RISCO_PROFESSOR';
  legalBasis: 'EC 103/2019 art. 5' | 'EC 103/2019 art. 10, §2º, III';
  requestedPromptBasis: 'EC 103/2019 art. 5 and art. 22';
  eligible: boolean;
  referenceDate: string;
  gender: AtividadeRiscoProfessorGender;
  population: AtividadeRiscoProfessorPopulation;
  assumptions: string[];
  required: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
    careerYears: number;
    tollYears: number;
  };
  observed: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
    careerYears: number;
    contributionYearsAtReform: number;
    careerYearsAtReform: number;
    enteredCareerByReform: boolean;
  };
  missing: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
    careerYears: number;
  };
  criteriaMet: string[];
  blockers: string[];
}

interface RequirementSet {
  legalBasis: AtividadeRiscoProfessorResult['legalBasis'];
  ageYears: number;
  contributionYears: number;
  publicServiceYears: number;
  currentPositionYears: number;
  careerYears: number;
  careerDateField: 'careerStartDate' | 'teachingStartDate';
  reformEntryRequired: boolean;
  riskTollAlternative: boolean;
  assumptions: string[];
}

@Injectable()
export class AtividadeRiscoProfessorService {
  private static readonly reformDate = '2019-11-13';

  evaluate(input: AtividadeRiscoProfessorInput): AtividadeRiscoProfessorResult {
    const referenceDate = this.toDate(input.referenceDate);
    const birthDate = this.toDate(input.birthDate);
    const contributionStartDate = this.toDate(input.contributionStartDate);
    const publicServiceStartDate = this.toDate(
      input.publicServiceStartDate ?? input.contributionStartDate,
    );
    const currentPositionStartDate = this.toDate(
      input.currentPositionStartDate ??
        input.publicServiceStartDate ??
        input.contributionStartDate,
    );
    const requirements = this.requirements(input.population, input.gender);
    const careerStartDate = this.toDate(
      input[requirements.careerDateField] ??
        input.careerStartDate ??
        input.teachingStartDate ??
        input.contributionStartDate,
    );
    const reformDate = this.toDate(AtividadeRiscoProfessorService.reformDate);
    const contributionYearsAtReform =
      input.contributionYearsAtReform ??
      this.yearsBetween(contributionStartDate, reformDate);
    const careerYearsAtReform =
      input.careerYearsAtReform ??
      this.yearsBetween(careerStartDate, reformDate);
    const enteredCareerByReform =
      input.enteredCareerByReform ??
      this.isOnOrBefore(careerStartDate, reformDate);
    const tollYears = requirements.riskTollAlternative
      ? Math.max(0, requirements.contributionYears - contributionYearsAtReform)
      : 0;
    const requiredAge = this.riskAgeRequirement(
      requirements,
      input.gender,
      tollYears,
    );
    const requiredContribution = requirements.contributionYears + tollYears;
    const observed = {
      ageYears: this.yearsBetween(birthDate, referenceDate),
      contributionYears: this.yearsBetween(
        contributionStartDate,
        referenceDate,
      ),
      publicServiceYears: this.yearsBetween(
        publicServiceStartDate,
        referenceDate,
      ),
      currentPositionYears: this.yearsBetween(
        currentPositionStartDate,
        referenceDate,
      ),
      careerYears: this.yearsBetween(careerStartDate, referenceDate),
      contributionYearsAtReform,
      careerYearsAtReform,
      enteredCareerByReform,
    };
    const missing = {
      ageYears: this.missing(requiredAge, observed.ageYears),
      contributionYears: this.missing(
        requiredContribution,
        observed.contributionYears,
      ),
      publicServiceYears: this.missing(
        requirements.publicServiceYears,
        observed.publicServiceYears,
      ),
      currentPositionYears: this.missing(
        requirements.currentPositionYears,
        observed.currentPositionYears,
      ),
      careerYears: this.missing(requirements.careerYears, observed.careerYears),
    };
    const entryBlockers =
      requirements.reformEntryRequired && !enteredCareerByReform
        ? ['INGRESSO_CARREIRA_ATE_REFORMA']
        : [];
    const criteriaMet = [
      ...(requirements.reformEntryRequired && enteredCareerByReform
        ? ['INGRESSO_CARREIRA_ATE_REFORMA']
        : []),
      ...(missing.ageYears === 0 ? ['IDADE_MINIMA'] : []),
      ...(missing.contributionYears === 0
        ? [this.contributionCriterion(input.population)]
        : []),
      ...(requirements.publicServiceYears > 0 &&
      missing.publicServiceYears === 0
        ? ['SERVICO_PUBLICO_MINIMO']
        : []),
      ...(requirements.currentPositionYears > 0 &&
      missing.currentPositionYears === 0
        ? ['CARGO_EFETIVO_5_ANOS']
        : []),
      ...(missing.careerYears === 0
        ? [this.careerCriterion(input.population)]
        : []),
    ];
    const blockers = [
      ...entryBlockers,
      ...(missing.ageYears > 0 ? ['IDADE_MINIMA'] : []),
      ...(missing.contributionYears > 0
        ? [this.contributionCriterion(input.population)]
        : []),
      ...(requirements.publicServiceYears > 0 && missing.publicServiceYears > 0
        ? ['SERVICO_PUBLICO_MINIMO']
        : []),
      ...(requirements.currentPositionYears > 0 &&
      missing.currentPositionYears > 0
        ? ['CARGO_EFETIVO_5_ANOS']
        : []),
      ...(missing.careerYears > 0
        ? [this.careerCriterion(input.population)]
        : []),
    ];

    return {
      rule: 'EC103_ATIVIDADE_RISCO_PROFESSOR',
      legalBasis: requirements.legalBasis,
      requestedPromptBasis: 'EC 103/2019 art. 5 and art. 22',
      eligible: blockers.length === 0,
      referenceDate: this.toIsoDate(referenceDate),
      gender: input.gender,
      population: input.population,
      assumptions: requirements.assumptions,
      required: {
        ageYears: requiredAge,
        contributionYears: this.roundYears(requiredContribution),
        publicServiceYears: requirements.publicServiceYears,
        currentPositionYears: requirements.currentPositionYears,
        careerYears: requirements.careerYears,
        tollYears: this.roundYears(tollYears),
      },
      observed: {
        ageYears: this.roundYears(observed.ageYears),
        contributionYears: this.roundYears(observed.contributionYears),
        publicServiceYears: this.roundYears(observed.publicServiceYears),
        currentPositionYears: this.roundYears(observed.currentPositionYears),
        careerYears: this.roundYears(observed.careerYears),
        contributionYearsAtReform: this.roundYears(contributionYearsAtReform),
        careerYearsAtReform: this.roundYears(careerYearsAtReform),
        enteredCareerByReform,
      },
      missing,
      criteriaMet,
      blockers,
    };
  }

  private requirements(
    population: AtividadeRiscoProfessorPopulation,
    gender: AtividadeRiscoProfessorGender,
  ): RequirementSet {
    if (population === 'RISK_ACTIVITY') {
      return {
        legalBasis: 'EC 103/2019 art. 5',
        ageYears: 55,
        contributionYears: gender === 'FEMALE' ? 25 : 30,
        publicServiceYears: 0,
        currentPositionYears: 0,
        careerYears: gender === 'FEMALE' ? 15 : 20,
        careerDateField: 'careerStartDate',
        reformEntryRequired: true,
        riskTollAlternative: true,
        assumptions: [
          'Art. 5 applies to police, federal penitentiary, and socioeducational careers admitted by 2019-11-13.',
          'LC 51/1985 contribution and strict police-career time are represented as configurable observed dates/years; defaults are 25/15 years for women and 30/20 years for men.',
          'Art. 5 §3 toll alternative lowers the age floor to 52 for women and 53 for men when the 100 percent contribution shortfall is still owed from the reform date.',
        ],
      };
    }

    return {
      legalBasis: 'EC 103/2019 art. 10, §2º, III',
      ageYears: gender === 'FEMALE' ? 57 : 60,
      contributionYears: 25,
      publicServiceYears: 10,
      currentPositionYears: 5,
      careerYears: 25,
      careerDateField: 'teachingStartDate',
      reformEntryRequired: false,
      riskTollAlternative: false,
      assumptions: [
        'Teacher population is encoded from the federal teacher rule in EC 103 art. 10 §2º III because art. 22 is the disability rule, not a magisterium rule.',
        'Teaching time must be exclusively effective magisterium in early-childhood, elementary, or secondary education.',
        'The service does not choose a state or municipal local-law override; root integration must pass local configuration if an ente has its own rule.',
      ],
    };
  }

  private riskAgeRequirement(
    requirements: RequirementSet,
    gender: AtividadeRiscoProfessorGender,
    tollYears: number,
  ): number {
    if (!requirements.riskTollAlternative || tollYears === 0) {
      return requirements.ageYears;
    }
    return gender === 'FEMALE' ? 52 : 53;
  }

  private contributionCriterion(
    population: AtividadeRiscoProfessorPopulation,
  ): string {
    return population === 'RISK_ACTIVITY'
      ? 'TEMPO_CONTRIBUICAO_LC51_COM_PEDAGIO'
      : 'TEMPO_CONTRIBUICAO_MAGISTERIO';
  }

  private careerCriterion(
    population: AtividadeRiscoProfessorPopulation,
  ): string {
    return population === 'RISK_ACTIVITY'
      ? 'TEMPO_CARREIRA_RISCO'
      : 'TEMPO_EFETIVO_MAGISTERIO';
  }

  private toDate(value: Date | string | null | undefined): Date {
    if (!value) {
      return new Date(Number.NaN);
    }
    if (value instanceof Date) {
      return value;
    }
    return new Date(`${value}T00:00:00.000Z`);
  }

  private yearsBetween(start: Date, end: Date): number {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }
    const milliseconds = end.getTime() - start.getTime();
    return Math.max(0, milliseconds / 31_556_952_000);
  }

  private isOnOrBefore(start: Date, end: Date): boolean {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }
    return start.getTime() <= end.getTime();
  }

  private missing(required: number, observed: number): number {
    return this.roundYears(Math.max(0, required - observed));
  }

  private roundYears(value: number): number {
    return Number(value.toFixed(4));
  }

  private toIsoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
