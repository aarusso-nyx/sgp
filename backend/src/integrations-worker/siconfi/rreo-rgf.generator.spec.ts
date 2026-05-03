import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SiconfiRreoRgfGenerator } from './rreo-rgf.generator';

describe('SiconfiRreoRgfGenerator', () => {
  it('generates a deterministic RREO/RGF CSV from caller-selected official layout metadata', () => {
    const generator = new SiconfiRreoRgfGenerator();

    expect(
      generator.generateCsv({
        sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT',
        declaration: 'RREO',
        layoutEdition: 'MDF-15-2026',
        sourceUrl:
          'https://www.gov.br/tesouronacional/pt-br/contabilidade-e-custos/manuais/manual-de-demonstrativos-fiscais-mdf',
        tenantIbgeCode: '3550308',
        period: '2026-BIM-02',
        rows: [
          {
            annex: 'Anexo 1',
            table: 'Receitas',
            accountCode: '1.0.0.0.00.0.0',
            label: 'Receita corrente',
            value: '1250000.00',
          },
        ],
      }),
    ).toBe(
      readFileSync(
        join(
          __dirname,
          '../../../../tests/backend/fixtures/official-exports/siconfi-rreo.golden.csv',
        ),
        'utf8',
      ),
    );
  });
});
