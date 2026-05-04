import { readFileSync } from 'node:fs';

import { buildR2000ServiceRetentionXml } from './r2000.builder';
import { buildR2055EventXml, R2055EventInput } from './r2055.builder';

const goldenRoot = '../tests/backend/golden/efd-reinf-r2055-v01';

describe('EFD-Reinf R-2055 and R-2000 builders', () => {
  it('builds the R-2055 NT 01/2026 retroactive adjustment golden XML', () => {
    const input = readJson<R2055EventInput>('input.json');

    const xml = buildR2055EventXml(input);

    expect(xml).toBe(golden('expected.xml'));
  });

  it('enforces the retroactive competence-N path for R-2055 adjustments', () => {
    const input = readJson<R2055EventInput>('input.json');
    const invalid: R2055EventInput = {
      ...input,
      reportingCompetence: '2026-03',
      acquisitions: input.acquisitions.map((acquisition) => ({
        ...acquisition,
        retroactiveAdjustment: acquisition.retroactiveAdjustment
          ? {
              ...acquisition.retroactiveAdjustment,
              referenceCompetence: '2026-03',
            }
          : undefined,
      })),
    };

    expect(() => buildR2055EventXml(invalid)).toThrow(
      'Retroactive EFD-Reinf adjustment must reference a competence before 2026-03',
    );
  });

  it('builds an R-2000 service retention XML with NT 01/2026 additional retention fields', () => {
    const xml = buildR2000ServiceRetentionXml({
      eventId: 'IDR2010NT0120260000000000000001',
      eventCode: 'R2010',
      reportingCompetence: '2026-03',
      contributor: {
        registrationType: '1',
        registrationNumber: '12345678000190',
      },
      establishment: {
        registrationType: '1',
        registrationNumber: '12345678000190',
        constructionIndicator: '0',
      },
      counterparty: {
        registrationType: '1',
        registrationNumber: '99887766000155',
        name: 'Prestador Servicos Exemplo LTDA',
      },
      invoices: [
        {
          sourceRunId: '00000000-0000-4000-8000-000000002010',
          series: 'A1',
          number: 'NF-2010-0001',
          issuedOn: '2026-03-05',
          grossAmount: '50000.00',
          retentionBaseAmount: '50000.00',
          principalRetainedAmount: '5500.00',
          additionalRetainedAmount: '250.00',
          principalNotRetainedAmount: '0.00',
          additionalNotRetainedAmount: '0.00',
          cprbIndicator: 'N',
        },
      ],
    });

    expect(xml).toBe(golden('expected-r2000.xml'));
  });
});

function golden(name: string): string {
  return readFileSync(`${goldenRoot}/${name}`, 'utf8').trimEnd();
}

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(`${goldenRoot}/${name}`, 'utf8')) as T;
}
