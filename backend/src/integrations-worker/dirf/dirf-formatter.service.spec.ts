import {
  DirfFormatterService,
  layoutVersionForYear,
} from './dirf-formatter.service';

describe('DirfFormatterService', () => {
  const service = new DirfFormatterService();

  it('formats the DIRF TXT golden for 2 PF, 1 PJ, and 1 exterior beneficiary', () => {
    const beneficiaries = service.aggregate([
      source(
        'CPF',
        '11111111111',
        'Ana Silva',
        '0588',
        '2026-01-01',
        '1000.00',
        '100.00',
      ),
      source(
        'CPF',
        '11111111111',
        'Ana Silva',
        '0588',
        '2026-02-01',
        '500.00',
        '50.00',
      ),
      source(
        'CPF',
        '22222222222',
        'Bruno Lima',
        '3208',
        '2026-03-01',
        '800.00',
        '80.00',
      ),
      source(
        'CNPJ',
        '12345678000199',
        'Acme Servicos Ltda',
        '1708',
        '2026-04-01',
        '2500.00',
        '250.00',
      ),
      source(
        'EXTERIOR',
        'EXT-0001',
        'Global Expert LLC',
        '0473',
        '2026-05-01',
        '3000.00',
        '450.00',
      ),
    ]);

    const txt = service.format({
      tenantId: '00000000-0000-0000-0000-00000000f502',
      yearBase: 2026,
      kind: 'ORIGINAL',
      originalArquivoId: null,
      layoutVersion: layoutVersionForYear(2026),
      beneficiaries,
    });

    expect(txt).toMatchInlineSnapshot(`
"DIRF|DIRF-RFB-2.060/2026|2026|ORIGINAL|
ABERTURA|00000000-0000-0000-0000-00000000f502||
BENEF|CPF|11111111111|Ana Silva|1500.00|150.00|
PAGTO|0588|2026-01|1000.00|100.00|{}|
PAGTO|0588|2026-02|500.00|50.00|{}|
BENEF|CNPJ|12345678000199|Acme Servicos Ltda|2500.00|250.00|
PAGTO|1708|2026-04|2500.00|250.00|{}|
BENEF|CPF|22222222222|Bruno Lima|800.00|80.00|
PAGTO|3208|2026-03|800.00|80.00|{}|
BENEF|EXTERIOR|EXT-0001|Global Expert LLC|3000.00|450.00|
PAGTO|0473|2026-05|3000.00|450.00|{}|
TOTAL|4|5|7800.00|930.00|
FIMDIRF|
"
`);
  });
});

function source(
  beneficiaryKind: 'CPF' | 'CNPJ' | 'EXTERIOR',
  beneficiaryDocument: string,
  beneficiaryName: string,
  revenueCode: string,
  monthYear: string,
  amount: string,
  irrf: string,
) {
  return {
    beneficiaryKind,
    beneficiaryDocument,
    beneficiaryName,
    revenueCode,
    monthYear,
    amount,
    irrf,
    deductions: {},
  };
}
