import { Injectable } from '@nestjs/common';

export type Pedagio100Gender = 'FEMALE' | 'MALE';

export interface Pedagio100Input {
  gender: Pedagio100Gender;
  birthDate: Date | string | null;
  referenceDate: Date | string;
  contributionStartDate: Date | string | null;
  publicServiceStartDate?: Date | string | null | undefined;
  currentPositionStartDate?: Date | string | null | undefined;
  contributionYearsAtReform?: number | undefined;
  teacher?: boolean | undefined;
}

export interface Pedagio100Result {
  rule: 'EC103_PEDAGIO_100';
  legalBasis: 'EC 103/2019 art. 20';
  eligible: boolean;
  referenceDate: string;
  gender: Pedagio100Gender;
  required: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
    tollYears: number;
  };
  observed: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
    contributionYearsAtReform: number;
  };
  missing: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
  };
  criteriaMet: string[];
  blockers: string[];
}

@Injectable()
export class Pedagio100Service {
  private static readonly reformDate = '2019-11-13';
  private static readonly publicServiceYears = 20;
  private static readonly currentPositionYears = 5;

  evaluate(input: Pedagio100Input): Pedagio100Result {
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
    const reformDate = this.toDate(Pedagio100Service.reformDate);
    const base = this.baseRequirements(input.gender, input.teacher ?? false);
    const observedContributionAtReform =
      input.contributionYearsAtReform ??
      this.yearsBetween(contributionStartDate, reformDate);
    const tollYears = Math.max(
      0,
      base.contributionYears - observedContributionAtReform,
    );
    const requiredContribution = base.contributionYears + tollYears;
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
      contributionYearsAtReform: this.roundYears(observedContributionAtReform),
    };
    const required = {
      ageYears: base.ageYears,
      contributionYears: this.roundYears(requiredContribution),
      publicServiceYears: Pedagio100Service.publicServiceYears,
      currentPositionYears: Pedagio100Service.currentPositionYears,
      tollYears: this.roundYears(tollYears),
    };
    const missing = {
      ageYears: this.missing(base.ageYears, observed.ageYears),
      contributionYears: this.missing(
        requiredContribution,
        observed.contributionYears,
      ),
      publicServiceYears: this.missing(
        Pedagio100Service.publicServiceYears,
        observed.publicServiceYears,
      ),
      currentPositionYears: this.missing(
        Pedagio100Service.currentPositionYears,
        observed.currentPositionYears,
      ),
    };
    const criteriaMet = [
      ...(missing.ageYears === 0 ? ['IDADE_MINIMA'] : []),
      ...(missing.contributionYears === 0
        ? ['TEMPO_CONTRIBUICAO_COM_PEDAGIO_100']
        : []),
      ...(missing.publicServiceYears === 0 ? ['SERVICO_PUBLICO_20_ANOS'] : []),
      ...(missing.currentPositionYears === 0 ? ['CARGO_EFETIVO_5_ANOS'] : []),
    ];
    const blockers = [
      ...(missing.ageYears > 0 ? ['IDADE_MINIMA'] : []),
      ...(missing.contributionYears > 0
        ? ['TEMPO_CONTRIBUICAO_COM_PEDAGIO_100']
        : []),
      ...(missing.publicServiceYears > 0 ? ['SERVICO_PUBLICO_20_ANOS'] : []),
      ...(missing.currentPositionYears > 0 ? ['CARGO_EFETIVO_5_ANOS'] : []),
    ];

    return {
      rule: 'EC103_PEDAGIO_100',
      legalBasis: 'EC 103/2019 art. 20',
      eligible: blockers.length === 0,
      referenceDate: this.toIsoDate(referenceDate),
      gender: input.gender,
      required,
      observed: {
        ageYears: this.roundYears(observed.ageYears),
        contributionYears: this.roundYears(observed.contributionYears),
        publicServiceYears: this.roundYears(observed.publicServiceYears),
        currentPositionYears: this.roundYears(observed.currentPositionYears),
        contributionYearsAtReform: observed.contributionYearsAtReform,
      },
      missing,
      criteriaMet,
      blockers,
    };
  }

  private baseRequirements(gender: Pedagio100Gender, teacher: boolean) {
    const ageYears = gender === 'FEMALE' ? 57 : 60;
    const contributionYears = gender === 'FEMALE' ? 30 : 35;
    if (!teacher) {
      return { ageYears, contributionYears };
    }
    return {
      ageYears: ageYears - 5,
      contributionYears: contributionYears - 5,
    };
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
