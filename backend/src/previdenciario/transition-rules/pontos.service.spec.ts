import { PontosService } from './pontos.service';

describe('PontosService', () => {
  const service = new PontosService();

  it('marks a male servidor eligible when EC 103 art. 4 point-rule requirements are met', () => {
    const result = service.evaluate({
      gender: 'MALE',
      birthDate: '1962-01-01',
      contributionStartDate: '1985-01-01',
      publicServiceStartDate: '1998-01-01',
      currentPositionStartDate: '2010-01-01',
      referenceDate: '2025-01-01',
    });

    expect(result).toMatchObject({
      rule: 'EC103_PONTOS',
      legalBasis: 'EC 103/2019 art. 4',
      eligible: true,
      teacher: false,
      required: {
        ageYears: 62,
        contributionYears: 35,
        publicServiceYears: 20,
        currentPositionYears: 5,
        points: 102,
      },
      missing: {
        ageYears: 0,
        contributionYears: 0,
        publicServiceYears: 0,
        currentPositionYears: 0,
        points: 0,
      },
    });
    expect(result.criteriaMet).toEqual(
      expect.arrayContaining([
        'IDADE_MINIMA',
        'TEMPO_CONTRIBUICAO_MINIMO',
        'SERVICO_PUBLICO_20_ANOS',
        'CARGO_EFETIVO_5_ANOS',
        'SISTEMA_PONTOS',
      ]),
    );
  });

  it('returns blockers when age, contribution, public service, position, and points are below the rule floor', () => {
    const result = service.evaluate({
      gender: 'FEMALE',
      birthDate: '1974-01-01',
      contributionStartDate: '1998-01-01',
      publicServiceStartDate: '2012-01-01',
      currentPositionStartDate: '2023-01-01',
      referenceDate: '2025-01-01',
    });

    expect(result.eligible).toBe(false);
    expect(result.required).toMatchObject({
      ageYears: 57,
      contributionYears: 30,
      publicServiceYears: 20,
      currentPositionYears: 5,
      points: 92,
    });
    expect(result.missing.ageYears).toBeGreaterThan(0);
    expect(result.missing.contributionYears).toBeGreaterThan(0);
    expect(result.missing.publicServiceYears).toBeGreaterThan(0);
    expect(result.missing.currentPositionYears).toBeGreaterThan(0);
    expect(result.missing.points).toBeGreaterThan(0);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'IDADE_MINIMA',
        'TEMPO_CONTRIBUICAO_MINIMO',
        'SERVICO_PUBLICO_20_ANOS',
        'CARGO_EFETIVO_5_ANOS',
        'SISTEMA_PONTOS',
      ]),
    );
  });

  it('supports the ordinary year-table progression and caps required points after the EC 103 limits', () => {
    expect(service.requiredPoints('FEMALE', false, 2019)).toBe(86);
    expect(service.requiredPoints('FEMALE', false, 2020)).toBe(87);
    expect(service.requiredPoints('MALE', false, 2025)).toBe(102);
    expect(service.requiredPoints('MALE', false, 2028)).toBe(105);
    expect(service.requiredPoints('FEMALE', false, 2033)).toBe(100);
    expect(service.requiredPoints('MALE', false, 2034)).toBe(105);

    expect(service.progressionTable(false)).toEqual(
      expect.arrayContaining([
        { year: 2019, femalePoints: 86, malePoints: 96 },
        { year: 2028, femalePoints: 95, malePoints: 105 },
        { year: 2033, femalePoints: 100, malePoints: 105 },
      ]),
    );
  });

  it('uses the teacher point table and age/contribution reductions from EC 103 art. 4 §§4-5', () => {
    const result = service.evaluate({
      gender: 'FEMALE',
      teacher: true,
      birthDate: '1968-01-01',
      contributionStartDate: '1995-01-01',
      publicServiceStartDate: '1998-01-01',
      currentPositionStartDate: '2010-01-01',
      referenceDate: '2025-01-01',
    });

    expect(result).toMatchObject({
      eligible: true,
      teacher: true,
      required: {
        ageYears: 52,
        contributionYears: 25,
        publicServiceYears: 20,
        currentPositionYears: 5,
        points: 87,
      },
      missing: {
        ageYears: 0,
        contributionYears: 0,
        publicServiceYears: 0,
        currentPositionYears: 0,
        points: 0,
      },
    });
    expect(service.requiredPoints('FEMALE', true, 2030)).toBe(92);
    expect(service.requiredPoints('MALE', true, 2031)).toBe(100);
    expect(service.progressionTable(true)).toEqual(
      expect.arrayContaining([
        { year: 2019, femalePoints: 81, malePoints: 91 },
        { year: 2028, femalePoints: 90, malePoints: 100 },
        { year: 2030, femalePoints: 92, malePoints: 100 },
      ]),
    );
  });
});
