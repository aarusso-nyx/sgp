import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DctfwebController } from './dctfweb.controller';

const sqlRoot = join(__dirname, '../../../../database/sql');

describe('DCTFWeb tenant and audit controls', () => {
  it('keeps DCTFWeb mutation tables under tenant RLS and write policies', () => {
    const fiscalSql = readFileSync(
      join(sqlRoot, '70-fiscal-final.sql'),
      'utf8',
    );

    for (const table of [
      'fiscal.dctfweb_declaration',
      'fiscal.dctfweb_item',
      'fiscal.dctf_pgd_tax_debit',
    ]) {
      expect(fiscalSql).toContain(
        `ALTER TABLE ONLY ${table} FORCE ROW LEVEL SECURITY`,
      );
      expect(fiscalSql).toContain(
        `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(fiscalSql).toContain(
        `CREATE POLICY ${policyPrefix(table)}_select`,
      );
      expect(fiscalSql).toContain(`CREATE POLICY ${policyPrefix(table)}_write`);
      expect(fiscalSql).toContain('public.sgp_tenant_matches(tenant_id)');
      expect(fiscalSql).toContain("'fiscal.dctfweb.write'::text");
    }
  });

  it('keeps declaration and item database audit triggers append-oriented', () => {
    const fiscalSql = readFileSync(
      join(sqlRoot, '70-fiscal-final.sql'),
      'utf8',
    );
    const functionsSql = readFileSync(
      join(sqlRoot, '40-fiscal-functions.sql'),
      'utf8',
    );

    expect(fiscalSql).toContain(
      'CREATE TRIGGER dctfweb_declaration_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dctfweb_declaration',
    );
    expect(fiscalSql).toContain(
      'CREATE TRIGGER dctfweb_item_audit AFTER INSERT OR DELETE OR UPDATE ON fiscal.dctfweb_item',
    );
    expect(functionsSql).toContain(
      'CREATE FUNCTION fiscal.sgp_dctfweb_audit()',
    );
    expect(functionsSql).toContain('public.sgp_append_audit_event');
  });

  it('records application audit events for DCTFWeb declaration mutations', async () => {
    const declaration = {
      id: '00000000-0000-4000-8000-00000000dctf',
      competence: '2026-01-01',
      kind: 'ORIGINAL',
      itemCount: 2,
      totalAmount: '270.00',
      signedXmlHash: 'b'.repeat(64),
      status: 'ACCEPTED',
      receiptNumber: 'DCTFWEB-REC-1',
      transmittedXmlHash: 'c'.repeat(64),
    };
    const builder = { generate: jest.fn(async () => declaration) };
    const signer = { sign: jest.fn(async () => declaration) };
    const transmitter = { transmit: jest.fn(async () => declaration) };
    const mitInclusion = { generate: jest.fn() };
    const auditService = { auditMutation: jest.fn() };
    const controller = new DctfwebController(
      builder as never,
      signer as never,
      transmitter as never,
      mitInclusion as never,
      auditService as never,
    );
    const request = { context: { requestId: 'req-dctfweb' } } as never;

    await controller.generate(request, { year: 2026, month: 1 });
    await controller.sign(request, declaration.id);
    await controller.transmit(request, declaration.id);

    expect(auditService.auditMutation).toHaveBeenCalledWith(
      request,
      'PROCESS',
      'fiscal.dctfweb',
      expect.objectContaining({
        resourceId: declaration.id,
        tableName: 'fiscal.dctfweb_declaration',
      }),
    );
    expect(auditService.auditMutation).toHaveBeenCalledWith(
      request,
      'PROCESS',
      'fiscal.dctfweb',
      expect.objectContaining({
        metadata: expect.objectContaining({
          signedXmlHash: declaration.signedXmlHash,
        }),
      }),
    );
    expect(auditService.auditMutation).toHaveBeenCalledWith(
      request,
      'PROCESS',
      'fiscal.dctfweb',
      expect.objectContaining({
        metadata: expect.objectContaining({
          receiptNumber: declaration.receiptNumber,
          transmittedXmlHash: declaration.transmittedXmlHash,
        }),
      }),
    );
  });
});

function policyPrefix(table: string): string {
  return table.replace('fiscal.', '');
}
