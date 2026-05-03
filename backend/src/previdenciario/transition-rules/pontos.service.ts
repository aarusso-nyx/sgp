import { Injectable } from '@nestjs/common';

export type PontosGender = 'FEMALE' | 'MALE';

export interface PontosInput {
  gender: PontosGender;
  birthDate: Date | string | null;
  referenceDate: Date | string;
  contributionStartDate: Date | string | null;
  publicServiceStartDate?: Date | string | null;
  currentPositionStartDate?: Date | string | null;
  teacher?: boolean;
}

export interface PontosYearRequirement {
  year: number;
  femalePoints: number;
  malePoints: number;
}

export interface PontosResult {
  rule: 'EC103_PONTOS';
  legalBasis: 'EC 103/2019 art. 4';
  eligible: boolean;
  referenceDate: string;
  gender: PontosGender;
  teacher: boolean;
  required: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
    points: number;
  };
  observed: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
    points: number;
  };
  missing: {
    ageYears: number;
    contributionYears: number;
    publicServiceYears: number;
    currentPositionYears: number;
    points: number;
  };
  pointsProgression: PontosYearRequirement[];
  criteriaMet: string[];
  blockers: string[];
}

interface PointsProgressionConfig {
  initialFemalePoints: number;
  initialMalePoints: number;
  femaleCap: number;
  maleCap: number;
}

@Injectable()
export class PontosService {
  private static readonly progressionStartYear = 2019;
  private static readonly firstIncrementYear = 2020;
  private static readonly publicServiceYears = 20;
  private static readonly currentPositionYears = 5;

  evaluate(input: PontosInput): PontosResult {
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
    const teacher = input.teacher ?? false;
    const base = this.baseRequirements(input.gender, teacher, referenceDate);
    const requiredPoints = this.requiredPoints(
      input.gender,
      teacher,
      referenceDate.getUTCFullYear(),
    );
    const ageYears = this.yearsBetween(birthDate, referenceDate);
    const contributionYears = this.yearsBetween(
      contributionStartDate,
      referenceDate,
    );
    const observed = {
      ageYears,
      contributionYears,
      publicServiceYears: this.yearsBetween(
        publicServiceStartDate,
        referenceDate,
      ),
      currentPositionYears: this.yearsBetween(
        currentPositionStartDate,
        referenceDate,
      ),
      points: ageYears + contributionYears,
    };
    const required = {
      ageYears: base.ageYears,
      contributionYears: base.contributionYears,
      publicServiceYears: PontosService.publicServiceYears,
      currentPositionYears: PontosService.currentPositionYears,
      points: requiredPoints,
    };
    const missing = {
      ageYears: this.missing(required.ageYears, observed.ageYears),
      contributionYears: this.missing(
        required.contributionYears,
        observed.contributionYears,
      ),
      publicServiceYears: this.missing(
        required.publicServiceYears,
        observed.publicServiceYears,
      ),
      currentPositionYears: this.missing(
        required.currentPositionYears,
        observed.currentPositionYears,
      ),
      points: this.missing(required.points, observed.points),
    };
    const criteriaMet = [
      ...(missing.ageYears === 0 ? ['IDADE_MINIMA'] : []),
      ...(missing.contributionYears === 0 ? ['TEMPO_CONTRIBUICAO_MINIMO'] : []),
      ...(missing.publicServiceYears === 0 ? ['SERVICO_PUBLICO_20_ANOS'] : []),
      ...(missing.currentPositionYears === 0 ? ['CARGO_EFETIVO_5_ANOS'] : []),
      ...(missing.points === 0 ? ['SISTEMA_PONTOS'] : []),
    ];
    const blockers = [
      ...(missing.ageYears > 0 ? ['IDADE_MINIMA'] : []),
      ...(missing.contributionYears > 0 ? ['TEMPO_CONTRIBUICAO_MINIMO'] : []),
      ...(missing.publicServiceYears > 0 ? ['SERVICO_PUBLICO_20_ANOS'] : []),
      ...(missing.currentPositionYears > 0 ? ['CARGO_EFETIVO_5_ANOS'] : []),
      ...(missing.points > 0 ? ['SISTEMA_PONTOS'] : []),
    ];

    return {
      rule: 'EC103_PONTOS',
      legalBasis: 'EC 103/2019 art. 4',
      eligible: blockers.length === 0,
      referenceDate: this.toIsoDate(referenceDate),
      gender: input.gender,
      teacher,
      required,
      observed: {
        ageYears: this.roundYears(observed.ageYears),
        contributionYears: this.roundYears(observed.contributionYears),
        publicServiceYears: this.roundYears(observed.publicServiceYears),
        currentPositionYears: this.roundYears(observed.currentPositionYears),
        points: this.roundYears(observed.points),
      },
      missing,
      pointsProgression: this.progressionTable(teacher),
      criteriaMet,
      blockers,
    };
  }

  progressionTable(teacher = false): PontosYearRequirement[] {
    const config = this.progressionConfig(teacher);
    const finalYear = this.finalProgressionYear(config);
    const requirements: PontosYearRequirement[] = [];

    for (
      let year = PontosService.progressionStartYear;
      year <= finalYear;
      year += 1
    ) {
      requirements.push({
        year,
        femalePoints: this.pointsForYear(
          year,
          config.initialFemalePoints,
          config.femaleCap,
        ),
        malePoints: this.pointsForYear(
          year,
          config.initialMalePoints,
          config.maleCap,
        ),
      });
    }

    return requirements;
  }

  requiredPoints(
    gender: PontosGender,
    teacher: boolean,
    referenceYear: number,
  ): number {
    const config = this.progressionConfig(teacher);
    if (gender === 'FEMALE') {
      return this.pointsForYear(
        referenceYear,
        config.initialFemalePoints,
        config.femaleCap,
      );
    }
    return this.pointsForYear(
      referenceYear,
      config.initialMalePoints,
      config.maleCap,
    );
  }

  private baseRequirements(
    gender: PontosGender,
    teacher: boolean,
    referenceDate: Date,
  ) {
    const ageIncrementApplies = referenceDate >= this.toDate('2022-01-01');
    if (teacher) {
      return {
        ageYears:
          gender === 'FEMALE'
            ? ageIncrementApplies
              ? 52
              : 51
            : ageIncrementApplies
              ? 57
              : 56,
        contributionYears: gender === 'FEMALE' ? 25 : 30,
      };
    }

    return {
      ageYears:
        gender === 'FEMALE'
          ? ageIncrementApplies
            ? 57
            : 56
          : ageIncrementApplies
            ? 62
            : 61,
      contributionYears: gender === 'FEMALE' ? 30 : 35,
    };
  }

  private progressionConfig(teacher: boolean): PointsProgressionConfig {
    if (teacher) {
      return {
        initialFemalePoints: 81,
        initialMalePoints: 91,
        femaleCap: 92,
        maleCap: 100,
      };
    }

    return {
      initialFemalePoints: 86,
      initialMalePoints: 96,
      femaleCap: 100,
      maleCap: 105,
    };
  }

  private finalProgressionYear(config: PointsProgressionConfig): number {
    const femaleYears = config.femaleCap - config.initialFemalePoints;
    const maleYears = config.maleCap - config.initialMalePoints;
    return (
      PontosService.progressionStartYear + Math.max(femaleYears, maleYears)
    );
  }

  private pointsForYear(
    year: number,
    initialPoints: number,
    cap: number,
  ): number {
    if (year < PontosService.firstIncrementYear) {
      return initialPoints;
    }
    return Math.min(
      cap,
      initialPoints + year - PontosService.progressionStartYear,
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
