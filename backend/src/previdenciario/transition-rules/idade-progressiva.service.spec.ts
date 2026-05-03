import { IdadeProgressivaService } from './idade-progressiva.service';

describe('IdadeProgressivaService', () => {
  const service = new IdadeProgressivaService();

  it('marks a male RGPS segurado eligible when affiliation, contribution, and progressive age are met', () => {
    const result = service.evaluate({
      gender: 'MALE',
      birthDate: '1961-01-01',
      contributionStartDate: '1988-01-01',
      contributionYearsAtReference: 37,
      referenceDate: '2026-01-01',
    });

    expect(result).toMatchObject({
      rule: 'EC103_IDADE_PROGRESSIVA',
      legalBasis: 'EC 103/2019 art. 16',
      eligible: true,
      teacher: false,
      required: {
        ageYears: 64.5,
        contributionYears: 35,
        affiliatedByReform: true,
      },
      observed: {
        affiliatedByReform: true,
        contributionYears: 37,
      },
      missing: {
        ageYears: 0,
        contributionYears: 0,
      },
    });
    expect(result.criteriaMet).toEqual([
      'FILIACAO_ATE_REFORMA',
      'IDADE_MINIMA_PROGRESSIVA',
      'TEMPO_CONTRIBUICAO_MINIMO',
    ]);
  });

  it('returns blockers when affiliation, age, and contribution requirements are not met', () => {
    const result = service.evaluate({
      gender: 'FEMALE',
      birthDate: '1970-01-01',
      contributionStartDate: '2020-01-01',
      contributionYearsAtReference: 29,
      referenceDate: '2025-01-01',
    });

    expect(result.eligible).toBe(false);
    expect(result.required).toMatchObject({
      ageYears: 59,
      contributionYears: 30,
      affiliatedByReform: true,
    });
    expect(result.observed.affiliatedByReform).toBe(false);
    expect(result.missing.ageYears).toBeGreaterThan(0);
    expect(result.missing.contributionYears).toBe(1);
    expect(result.blockers).toEqual([
      'FILIACAO_ATE_REFORMA',
      'IDADE_MINIMA_PROGRESSIVA',
      'TEMPO_CONTRIBUICAO_MINIMO',
    ]);
  });

  it('keeps the ordinary 0.5-year annual age progression data-driven and capped', () => {
    expect(service.requiredAge('FEMALE', false, 2019)).toBe(56);
    expect(service.requiredAge('FEMALE', false, 2020)).toBe(56.5);
    expect(service.requiredAge('MALE', false, 2026)).toBe(64.5);
    expect(service.requiredAge('MALE', false, 2027)).toBe(65);
    expect(service.requiredAge('FEMALE', false, 2031)).toBe(62);
    expect(service.requiredAge('FEMALE', false, 2032)).toBe(62);

    expect(service.progressionTable(false)).toEqual(
      expect.arrayContaining([
        { year: 2019, femaleAgeYears: 56, maleAgeYears: 61 },
        { year: 2026, femaleAgeYears: 59.5, maleAgeYears: 64.5 },
        { year: 2027, femaleAgeYears: 60, maleAgeYears: 65 },
        { year: 2031, femaleAgeYears: 62, maleAgeYears: 65 },
      ]),
    );
  });

  it('uses the teacher contribution reduction and teacher age caps from EC 103 art. 16 paragraph 2', () => {
    const result = service.evaluate({
      gender: 'FEMALE',
      teacher: true,
      birthDate: '1969-01-01',
      contributionStartDate: '1999-01-01',
      contributionYearsAtReference: 26,
      referenceDate: '2025-01-01',
    });

    expect(result).toMatchObject({
      eligible: true,
      teacher: true,
      required: {
        ageYears: 54,
        contributionYears: 25,
        affiliatedByReform: true,
      },
      missing: {
        ageYears: 0,
        contributionYears: 0,
      },
    });
    expect(service.requiredAge('FEMALE', true, 2031)).toBe(57);
    expect(service.requiredAge('MALE', true, 2027)).toBe(60);
    expect(service.progressionTable(true)).toEqual(
      expect.arrayContaining([
        { year: 2019, femaleAgeYears: 51, maleAgeYears: 56 },
        { year: 2025, femaleAgeYears: 54, maleAgeYears: 59 },
        { year: 2027, femaleAgeYears: 55, maleAgeYears: 60 },
        { year: 2031, femaleAgeYears: 57, maleAgeYears: 60 },
      ]),
    );
  });
});
