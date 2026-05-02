import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AudespXmlSerializer } from './audesp-xml.serializer';
import { audespFixturePayload } from '../testing/audesp-fixtures';

describe('AudespXmlSerializer', () => {
  it('generates deterministic XML matching the committed fixture', () => {
    const serializer = new AudespXmlSerializer();

    expect(normalize(serializer.serialize(audespFixturePayload()))).toBe(
      normalize(
        readFileSync(
          join(
            __dirname,
            '../../../../../test/fixtures/tce/audesp-sp/folha-pagamento.golden.xml',
          ),
          'utf8',
        ),
      ),
    );
  });
});

function normalize(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}
