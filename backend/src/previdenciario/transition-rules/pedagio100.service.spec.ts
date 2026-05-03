import { Pedagio100Service } from './pedagio100.service';

describe('Pedagio100Service', () => {
  const service = new Pedagio100Service();

  it('marks a male servidor eligible when age, contribution, public service, position, and 100 percent toll are met', () => {
    const result = service.evaluate({
      gender: 'MALE',
      birthDate: '1962-01-01',
      contributionStartDate: '1985-01-01',
      publicServiceStartDate: '1998-01-01',
      currentPositionStartDate: '2010-01-01',
      referenceDate: '2025-01-01',
      contributionYearsAtReform: 34,
    });

    expect(result).toMatchObject({
      rule: 'EC103_PEDAGIO_100',
      legalBasis: 'EC 103/2019 art. 20',
      eligible: true,
      required: {
        ageYears: 60,
        contributionYears: 36,
        publicServiceYears: 20,
        currentPositionYears: 5,
        tollYears: 1,
      },
      missing: {
        ageYears: 0,
        contributionYears: 0,
        publicServiceYears: 0,
        currentPositionYears: 0,
      },
    });
    expect(result.criteriaMet).toEqual(
      expect.arrayContaining([
        'IDADE_MINIMA',
        'TEMPO_CONTRIBUICAO_COM_PEDAGIO_100',
        'SERVICO_PUBLICO_20_ANOS',
        'CARGO_EFETIVO_5_ANOS',
      ]),
    );
  });

  it('returns blockers when the servidor still owes age, toll, public service, or position time', () => {
    const result = service.evaluate({
      gender: 'FEMALE',
      birthDate: '1972-01-01',
      contributionStartDate: '1995-01-01',
      publicServiceStartDate: '2012-01-01',
      currentPositionStartDate: '2023-01-01',
      referenceDate: '2025-01-01',
      contributionYearsAtReform: 27,
    });

    expect(result.eligible).toBe(false);
    expect(result.required).toMatchObject({
      ageYears: 57,
      contributionYears: 33,
      publicServiceYears: 20,
      currentPositionYears: 5,
      tollYears: 3,
    });
    expect(result.missing.ageYears).toBeGreaterThan(0);
    expect(result.missing.contributionYears).toBeGreaterThan(0);
    expect(result.missing.publicServiceYears).toBeGreaterThan(0);
    expect(result.missing.currentPositionYears).toBeGreaterThan(0);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'IDADE_MINIMA',
        'TEMPO_CONTRIBUICAO_COM_PEDAGIO_100',
        'SERVICO_PUBLICO_20_ANOS',
        'CARGO_EFETIVO_5_ANOS',
      ]),
    );
  });
});
