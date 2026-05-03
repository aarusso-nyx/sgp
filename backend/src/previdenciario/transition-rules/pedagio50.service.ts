import { Injectable } from '@nestjs/common';

export type Pedagio50Gender = 'FEMALE' | 'MALE';

export interface Pedagio50Input {
  gender: Pedagio50Gender;
  referenceDate: Date | string;
  contributionStartDate: Date | string | null;
  contributionYearsAtReform?: number;
  contributionYearsAtReference?: number;
}

export interface Pedagio50Result {
  rule: 'EC103_PEDAGIO_50';
  legalBasis: 'EC 103/2019 art. 17';
  eligible: boolean;
  referenceDate: string;
  gender: Pedagio50Gender;
  required: {
    contributionYears: number;
    contributionYearsAtReformGreaterThan: number;
    tollYears: number;
  };
  observed: {
    affiliatedAtReform: boolean;
    contributionYears: number;
    contributionYearsAtReform: number;
  };
  missing: {
    contributionYears: number;
  };
  criteriaMet: string[];
  blockers: string[];
}

@Injectable()
export class Pedagio50Service {
  private static readonly reformDate = '2019-11-13';

  evaluate(input: Pedagio50Input): Pedagio50Result {
    const referenceDate = this.toDate(input.referenceDate);
    const contributionStartDate = this.toDate(input.contributionStartDate);
    const reformDate = this.toDate(Pedagio50Service.reformDate);
    const base = this.baseRequirements(input.gender);
    const observedContributionAtReform =
      input.contributionYearsAtReform ??
      this.yearsBetween(contributionStartDate, reformDate);
    const observedContributionAtReference =
      input.contributionYearsAtReference ??
      this.yearsBetween(contributionStartDate, referenceDate);
    const tollYears = Math.max(
      0,
      (base.contributionYears - observedContributionAtReform) * 0.5,
    );
    const requiredContribution = base.contributionYears + tollYears;
    const affiliatedAtReform = this.isOnOrBefore(
      contributionStartDate,
      reformDate,
    );
    const entryContributionMet =
      observedContributionAtReform > base.contributionYearsAtReformThreshold;
    const missing = {
      contributionYears: this.missing(
        requiredContribution,
        observedContributionAtReference,
      ),
    };
    const criteriaMet = [
      ...(affiliatedAtReform ? ['FILIACAO_ATE_REFORMA'] : []),
      ...(entryContributionMet
        ? ['TEMPO_CONTRIBUICAO_REFORMA_MAIOR_28_33']
        : []),
      ...(missing.contributionYears === 0
        ? ['TEMPO_CONTRIBUICAO_COM_PEDAGIO_50']
        : []),
    ];
    const blockers = [
      ...(!affiliatedAtReform ? ['FILIACAO_ATE_REFORMA'] : []),
      ...(!entryContributionMet
        ? ['TEMPO_CONTRIBUICAO_REFORMA_MAIOR_28_33']
        : []),
      ...(missing.contributionYears > 0
        ? ['TEMPO_CONTRIBUICAO_COM_PEDAGIO_50']
        : []),
    ];

    return {
      rule: 'EC103_PEDAGIO_50',
      legalBasis: 'EC 103/2019 art. 17',
      eligible: blockers.length === 0,
      referenceDate: this.toIsoDate(referenceDate),
      gender: input.gender,
      required: {
        contributionYears: this.roundYears(requiredContribution),
        contributionYearsAtReformGreaterThan:
          base.contributionYearsAtReformThreshold,
        tollYears: this.roundYears(tollYears),
      },
      observed: {
        affiliatedAtReform,
        contributionYears: this.roundYears(observedContributionAtReference),
        contributionYearsAtReform: this.roundYears(
          observedContributionAtReform,
        ),
      },
      missing,
      criteriaMet,
      blockers,
    };
  }

  private baseRequirements(gender: Pedagio50Gender) {
    return gender === 'FEMALE'
      ? { contributionYears: 30, contributionYearsAtReformThreshold: 28 }
      : { contributionYears: 35, contributionYearsAtReformThreshold: 33 };
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
