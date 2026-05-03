import { Pedagio50Service } from './pedagio50.service';

describe('Pedagio50Service', () => {
  const service = new Pedagio50Service();

  it('marks a male RGPS segurado eligible when affiliation, reform contribution, and the 50 percent toll are met', () => {
    const result = service.evaluate({
      gender: 'MALE',
      contributionStartDate: '1985-11-13',
      referenceDate: '2021-06-01',
      contributionYearsAtReform: 34,
      contributionYearsAtReference: 35.6,
    });

    expect(result).toMatchObject({
      rule: 'EC103_PEDAGIO_50',
      legalBasis: 'EC 103/2019 art. 17',
      eligible: true,
      required: {
        contributionYears: 35.5,
        contributionYearsAtReformGreaterThan: 33,
        tollYears: 0.5,
      },
      observed: {
        affiliatedAtReform: true,
        contributionYears: 35.6,
        contributionYearsAtReform: 34,
      },
      missing: {
        contributionYears: 0,
      },
    });
    expect(result.criteriaMet).toEqual([
      'FILIACAO_ATE_REFORMA',
      'TEMPO_CONTRIBUICAO_REFORMA_MAIOR_28_33',
      'TEMPO_CONTRIBUICAO_COM_PEDAGIO_50',
    ]);
  });

  it('blocks the rule when the reform-date contribution threshold is not strictly greater than 28 or 33 years', () => {
    const result = service.evaluate({
      gender: 'FEMALE',
      contributionStartDate: '1991-11-13',
      referenceDate: '2024-01-01',
      contributionYearsAtReform: 28,
      contributionYearsAtReference: 32,
    });

    expect(result.eligible).toBe(false);
    expect(result.required).toMatchObject({
      contributionYears: 31,
      contributionYearsAtReformGreaterThan: 28,
      tollYears: 1,
    });
    expect(result.missing.contributionYears).toBe(0);
    expect(result.blockers).toEqual(['TEMPO_CONTRIBUICAO_REFORMA_MAIOR_28_33']);
  });

  it('returns blockers when the segurado still owes the 50 percent toll contribution time', () => {
    const result = service.evaluate({
      gender: 'MALE',
      contributionStartDate: '1986-05-13',
      referenceDate: '2021-07-01',
      contributionYearsAtReform: 33.5,
      contributionYearsAtReference: 35.25,
    });

    expect(result.eligible).toBe(false);
    expect(result.required).toMatchObject({
      contributionYears: 35.75,
      contributionYearsAtReformGreaterThan: 33,
      tollYears: 0.75,
    });
    expect(result.missing.contributionYears).toBe(0.5);
    expect(result.blockers).toEqual(['TEMPO_CONTRIBUICAO_COM_PEDAGIO_50']);
  });

  it('blocks contributors first affiliated after the EC 103 effective date', () => {
    const result = service.evaluate({
      gender: 'FEMALE',
      contributionStartDate: '2020-01-01',
      referenceDate: '2050-01-01',
      contributionYearsAtReform: 28.5,
      contributionYearsAtReference: 30.75,
    });

    expect(result.eligible).toBe(false);
    expect(result.blockers).toEqual(['FILIACAO_ATE_REFORMA']);
  });
});
