import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SiopsExportGenerator } from './siops-export.generator';

describe('SiopsExportGenerator', () => {
  it('generates a deterministic SIOPS CSV from caller-selected official layout metadata', () => {
    const generator = new SiopsExportGenerator();

    expect(
      generator.generateCsv({
        sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT',
        layoutEdition: 'SIOPS-2026-1BIM',
        sourceUrl:
          'https://portalfns.saude.gov.br/siops-arquivos-de-estrutura-e-nova-versao-do-sistema-para-o-1o-bimestre-de-2026-ja-estao-disponiveis/',
        tenantIbgeCode: '3550308',
        period: '2026-BIM-01',
        rows: [
          {
            category: 'ASPS',
            accountCode: '3.1.90.11',
            label: 'Vencimentos e vantagens fixas',
            value: '750000.00',
          },
        ],
      }),
    ).toBe(
      readFileSync(
        join(
          __dirname,
          '../../../../tests/backend/fixtures/official-exports/siops.golden.csv',
        ),
        'utf8',
      ),
    );
  });
});
