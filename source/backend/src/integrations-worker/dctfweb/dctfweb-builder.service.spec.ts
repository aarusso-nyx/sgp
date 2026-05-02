import { buildDctfwebXml } from './dctfweb-builder.service';

describe('DctfwebBuilderService', () => {
  it('builds the DCTFWeb XML golden for a fictitious competence', () => {
    const xml = buildDctfwebXml({
      tenantId: '00000000-0000-0000-0000-00000000f501',
      competence: '2026-01-01',
      kind: 'ORIGINAL',
      originalDeclarationId: null,
      items: [
        {
          sourceEvent: 'S5011',
          sourceRunId: '00000000-0000-4000-8000-000000005011',
          debitCode: '1082-01',
          baseAmount: '1000.00',
          amount: '200.00',
        },
        {
          sourceEvent: 'S5012',
          sourceRunId: '00000000-0000-4000-8000-000000005012',
          debitCode: '0561',
          baseAmount: '500.00',
          amount: '50.00',
        },
      ],
    });

    expect(xml).toMatchInlineSnapshot(`
"<?xml version="1.0" encoding="UTF-8"?>
<DCTFWeb xmlns="urn:br:gov:rfb:dctfweb:sgp:v1">
  <declaracao Id="DCTFb11abd46b6ac6a2cb8d7b5bfb4bdb429">
    <tenantId>00000000-0000-0000-0000-00000000f501</tenantId>
    <competencia>2026-01</competencia>
    <tipo>ORIGINAL</tipo>
    <totalizadores>
    <debito sourceEvent="S5011" sourceRunId="00000000-0000-4000-8000-000000005011" codigo="1082-01" base="1000.00" valor="200.00" />
    <debito sourceEvent="S5012" sourceRunId="00000000-0000-4000-8000-000000005012" codigo="0561" base="500.00" valor="50.00" />
    </totalizadores>
  </declaracao>
</DCTFWeb>"
`);
  });

  it('requires retificadora to reference the original declaration', () => {
    const xml = buildDctfwebXml({
      tenantId: '00000000-0000-0000-0000-00000000f501',
      competence: '2026-01-01',
      kind: 'RETIFICADORA',
      originalDeclarationId: '00000000-0000-4000-8000-00000000abcd',
      items: [
        {
          sourceEvent: 'S5013',
          sourceRunId: '00000000-0000-4000-8000-000000005013',
          debitCode: 'FGTS',
          baseAmount: '800.00',
          amount: '64.00',
        },
      ],
    });

    expect(xml).toContain(
      '<declaracaoOriginal>00000000-0000-4000-8000-00000000abcd</declaracaoOriginal>',
    );
  });
});
