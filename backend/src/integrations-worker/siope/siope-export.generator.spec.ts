import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SiopeExportGenerator } from './siope-export.generator';

describe('SiopeExportGenerator', () => {
  it('generates a deterministic SIOPE CSV from caller-selected official layout metadata', () => {
    const generator = new SiopeExportGenerator();

    expect(
      generator.generateCsv({
        sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT',
        layoutEdition: 'SIOPE-2026-26.0.1.2',
        sourceUrl: 'https://www.fnde.gov.br/siope/download.do',
        tenantIbgeCode: '3550308',
        year: 2026,
        rows: [
          {
            category: 'REMUNERACAO_PROFISSIONAIS',
            accountCode: 'FUNDEB-REM',
            label: 'Remuneracao dos profissionais da educacao',
            value: '500000.00',
          },
        ],
      }),
    ).toBe(
      readFileSync(
        join(
          __dirname,
          '../../../../tests/backend/fixtures/official-exports/siope.golden.csv',
        ),
        'utf8',
      ),
    );
  });
});
