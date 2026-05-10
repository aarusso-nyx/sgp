import { Injectable } from '@nestjs/common';

export type IdadeProgressivaGender = 'FEMALE' | 'MALE';

export interface IdadeProgressivaInput {
  gender: IdadeProgressivaGender;
  birthDate: Date | string | null;
  referenceDate: Date | string;
  contributionStartDate: Date | string | null;
  contributionYearsAtReference?: number | undefined;
  teacher?: boolean | undefined;
}

export interface IdadeProgressivaYearRequirement {
  year: number;
  femaleAgeYears: number;
  maleAgeYears: number;
}

export interface IdadeProgressivaResult {
  rule: 'EC103_IDADE_PROGRESSIVA';
  legalBasis: 'EC 103/2019 art. 16';
  eligible: boolean;
  referenceDate: string;
  gender: IdadeProgressivaGender;
  teacher: boolean;
  required: {
    ageYears: number;
    contributionYears: number;
    affiliatedByReform: true;
  };
  observed: {
    ageYears: number;
    contributionYears: number;
    affiliatedByReform: boolean;
  };
  missing: {
    ageYears: number;
    contributionYears: number;
  };
  ageProgression: IdadeProgressivaYearRequirement[];
  criteriaMet: string[];
  blockers: string[];
}

interface AgeProgressionConfig {
  initialFemaleAgeYears: number;
  initialMaleAgeYears: number;
  femaleCap: number;
  maleCap: number;
}

@Injectable()
export class IdadeProgressivaService {
  private static readonly reformDate = '2019-11-13';
  private static readonly progressionStartYear = 2019;
  private static readonly firstIncrementYear = 2020;
  private static readonly ageIncrementYears = 0.5;

  evaluate(input: IdadeProgressivaInput): IdadeProgressivaResult {
    const referenceDate = this.toDate(input.referenceDate);
    const birthDate = this.toDate(input.birthDate);
    const contributionStartDate = this.toDate(input.contributionStartDate);
    const reformDate = this.toDate(IdadeProgressivaService.reformDate);
    const teacher = input.teacher ?? false;
    const requiredAge = this.requiredAge(
      input.gender,
      teacher,
      referenceDate.getUTCFullYear(),
    );
    const requiredContribution = this.requiredContribution(
      input.gender,
      teacher,
    );
    const observedContribution =
      input.contributionYearsAtReference ??
      this.yearsBetween(contributionStartDate, referenceDate);
    const observed = {
      ageYears: this.yearsBetween(birthDate, referenceDate),
      contributionYears: observedContribution,
      affiliatedByReform: this.isOnOrBefore(contributionStartDate, reformDate),
    };
    const missing = {
      ageYears: this.missing(requiredAge, observed.ageYears),
      contributionYears: this.missing(
        requiredContribution,
        observed.contributionYears,
      ),
    };
    const criteriaMet = [
      ...(observed.affiliatedByReform ? ['FILIACAO_ATE_REFORMA'] : []),
      ...(missing.ageYears === 0 ? ['IDADE_MINIMA_PROGRESSIVA'] : []),
      ...(missing.contributionYears === 0 ? ['TEMPO_CONTRIBUICAO_MINIMO'] : []),
    ];
    const blockers = [
      ...(!observed.affiliatedByReform ? ['FILIACAO_ATE_REFORMA'] : []),
      ...(missing.ageYears > 0 ? ['IDADE_MINIMA_PROGRESSIVA'] : []),
      ...(missing.contributionYears > 0 ? ['TEMPO_CONTRIBUICAO_MINIMO'] : []),
    ];

    return {
      rule: 'EC103_IDADE_PROGRESSIVA',
      legalBasis: 'EC 103/2019 art. 16',
      eligible: blockers.length === 0,
      referenceDate: this.toIsoDate(referenceDate),
      gender: input.gender,
      teacher,
      required: {
        ageYears: requiredAge,
        contributionYears: requiredContribution,
        affiliatedByReform: true,
      },
      observed: {
        ageYears: this.roundYears(observed.ageYears),
        contributionYears: this.roundYears(observed.contributionYears),
        affiliatedByReform: observed.affiliatedByReform,
      },
      missing,
      ageProgression: this.progressionTable(teacher),
      criteriaMet,
      blockers,
    };
  }

  progressionTable(teacher = false): IdadeProgressivaYearRequirement[] {
    const config = this.progressionConfig(teacher);
    const finalYear = this.finalProgressionYear(config);
    const requirements: IdadeProgressivaYearRequirement[] = [];

    for (
      let year = IdadeProgressivaService.progressionStartYear;
      year <= finalYear;
      year += 1
    ) {
      requirements.push({
        year,
        femaleAgeYears: this.ageForYear(
          year,
          config.initialFemaleAgeYears,
          config.femaleCap,
        ),
        maleAgeYears: this.ageForYear(
          year,
          config.initialMaleAgeYears,
          config.maleCap,
        ),
      });
    }

    return requirements;
  }

  requiredAge(
    gender: IdadeProgressivaGender,
    teacher: boolean,
    referenceYear: number,
  ): number {
    const config = this.progressionConfig(teacher);
    if (gender === 'FEMALE') {
      return this.ageForYear(
        referenceYear,
        config.initialFemaleAgeYears,
        config.femaleCap,
      );
    }
    return this.ageForYear(
      referenceYear,
      config.initialMaleAgeYears,
      config.maleCap,
    );
  }

  private requiredContribution(
    gender: IdadeProgressivaGender,
    teacher: boolean,
  ): number {
    if (teacher) {
      return gender === 'FEMALE' ? 25 : 30;
    }
    return gender === 'FEMALE' ? 30 : 35;
  }

  private progressionConfig(teacher: boolean): AgeProgressionConfig {
    if (teacher) {
      return {
        initialFemaleAgeYears: 51,
        initialMaleAgeYears: 56,
        femaleCap: 57,
        maleCap: 60,
      };
    }

    return {
      initialFemaleAgeYears: 56,
      initialMaleAgeYears: 61,
      femaleCap: 62,
      maleCap: 65,
    };
  }

  private finalProgressionYear(config: AgeProgressionConfig): number {
    const femaleYears =
      (config.femaleCap - config.initialFemaleAgeYears) /
      IdadeProgressivaService.ageIncrementYears;
    const maleYears =
      (config.maleCap - config.initialMaleAgeYears) /
      IdadeProgressivaService.ageIncrementYears;
    return (
      IdadeProgressivaService.progressionStartYear +
      Math.max(femaleYears, maleYears)
    );
  }

  private ageForYear(year: number, initialAge: number, cap: number): number {
    if (year < IdadeProgressivaService.firstIncrementYear) {
      return initialAge;
    }
    return Math.min(
      cap,
      initialAge +
        (year - IdadeProgressivaService.progressionStartYear) *
          IdadeProgressivaService.ageIncrementYears,
    );
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
