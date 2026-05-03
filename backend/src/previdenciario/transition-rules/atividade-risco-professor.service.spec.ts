import { AtividadeRiscoProfessorService } from './atividade-risco-professor.service';

describe('AtividadeRiscoProfessorService', () => {
  const service = new AtividadeRiscoProfessorService();

  it('marks an EC 103 art. 5 male risk-career servidor eligible under the LC 51 floor', () => {
    const result = service.evaluate({
      population: 'RISK_ACTIVITY',
      gender: 'MALE',
      birthDate: '1964-01-01',
      contributionStartDate: '1989-01-01',
      careerStartDate: '1994-01-01',
      referenceDate: '2025-01-01',
      contributionYearsAtReform: 30,
      careerYearsAtReform: 20,
    });

    expect(result).toMatchObject({
      rule: 'EC103_ATIVIDADE_RISCO_PROFESSOR',
      legalBasis: 'EC 103/2019 art. 5',
      requestedPromptBasis: 'EC 103/2019 art. 5 and art. 22',
      eligible: true,
      population: 'RISK_ACTIVITY',
      required: {
        ageYears: 55,
        contributionYears: 30,
        publicServiceYears: 0,
        currentPositionYears: 0,
        careerYears: 20,
        tollYears: 0,
      },
      missing: {
        ageYears: 0,
        contributionYears: 0,
        publicServiceYears: 0,
        currentPositionYears: 0,
        careerYears: 0,
      },
    });
    expect(result.criteriaMet).toEqual(
      expect.arrayContaining([
        'INGRESSO_CARREIRA_ATE_REFORMA',
        'IDADE_MINIMA',
        'TEMPO_CONTRIBUICAO_LC51_COM_PEDAGIO',
        'TEMPO_CARREIRA_RISCO',
      ]),
    );
  });

  it('applies the EC 103 art. 5 paragraph 3 toll age for a female risk-career servidor', () => {
    const result = service.evaluate({
      population: 'RISK_ACTIVITY',
      gender: 'FEMALE',
      birthDate: '1972-01-01',
      contributionStartDate: '1997-01-01',
      careerStartDate: '2004-01-01',
      referenceDate: '2025-01-01',
      contributionYearsAtReform: 22,
      careerYearsAtReform: 15,
    });

    expect(result.eligible).toBe(true);
    expect(result.required).toMatchObject({
      ageYears: 52,
      contributionYears: 28,
      careerYears: 15,
      tollYears: 3,
    });
    expect(result.missing).toMatchObject({
      ageYears: 0,
      contributionYears: 0,
      careerYears: 0,
    });
  });

  it('blocks the risk-career rule when entry is after the EC 103 reform date', () => {
    const result = service.evaluate({
      population: 'RISK_ACTIVITY',
      gender: 'MALE',
      birthDate: '1960-01-01',
      contributionStartDate: '1985-01-01',
      careerStartDate: '2020-01-01',
      referenceDate: '2025-01-01',
      contributionYearsAtReform: 34,
      careerYearsAtReform: 0,
    });

    expect(result.eligible).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'INGRESSO_CARREIRA_ATE_REFORMA',
        'TEMPO_CARREIRA_RISCO',
      ]),
    );
  });

  it('marks a female teacher eligible using the federal teacher rule, not EC 103 art. 22', () => {
    const result = service.evaluate({
      population: 'TEACHER',
      gender: 'FEMALE',
      birthDate: '1967-01-01',
      contributionStartDate: '1995-01-01',
      teachingStartDate: '1995-01-01',
      publicServiceStartDate: '2000-01-01',
      currentPositionStartDate: '2015-01-01',
      referenceDate: '2025-01-01',
    });

    expect(result).toMatchObject({
      legalBasis: 'EC 103/2019 art. 10, §2º, III',
      requestedPromptBasis: 'EC 103/2019 art. 5 and art. 22',
      eligible: true,
      population: 'TEACHER',
      required: {
        ageYears: 57,
        contributionYears: 25,
        publicServiceYears: 10,
        currentPositionYears: 5,
        careerYears: 25,
        tollYears: 0,
      },
      missing: {
        ageYears: 0,
        contributionYears: 0,
        publicServiceYears: 0,
        currentPositionYears: 0,
        careerYears: 0,
      },
    });
    expect(result.assumptions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('art. 22 is the disability rule'),
      ]),
    );
  });

  it('returns teacher blockers for age, public service, current position, and exclusive magisterium time', () => {
    const result = service.evaluate({
      population: 'TEACHER',
      gender: 'MALE',
      birthDate: '1970-01-01',
      contributionStartDate: '2000-01-01',
      teachingStartDate: '2005-01-01',
      publicServiceStartDate: '2020-01-01',
      currentPositionStartDate: '2023-01-01',
      referenceDate: '2025-01-01',
    });

    expect(result.eligible).toBe(false);
    expect(result.required).toMatchObject({
      ageYears: 60,
      contributionYears: 25,
      publicServiceYears: 10,
      currentPositionYears: 5,
      careerYears: 25,
    });
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'IDADE_MINIMA',
        'SERVICO_PUBLICO_MINIMO',
        'CARGO_EFETIVO_5_ANOS',
        'TEMPO_EFETIVO_MAGISTERIO',
      ]),
    );
  });
});
