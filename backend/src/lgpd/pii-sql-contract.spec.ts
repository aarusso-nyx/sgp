import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('R2-204/R2-206 PII SQL contracts', () => {
  const piiCommentsSql = readSql('database/sql/13-pii-comments.sql');
  const piiEncryptionSql = readSql('database/sql/15-pii-encryption.sql');

  it('tags exactly 50 PII columns and exposes them for ROPA export', () => {
    const commentTags = piiCommentsSql.match(
      /COMMENT ON COLUMN .* IS 'pii=true;/g,
    );

    expect(commentTags).toHaveLength(50);
    expect(piiCommentsSql).toContain('CREATE VIEW lgpd.v_pii_column_catalog');
    expect(piiCommentsSql).toContain('rule.source_tables');
    expect(piiCommentsSql).toContain('ropa_flow_keys');
  });

  it('encrypts the R2-206 bank-account and PIS/PASEP new-write path at rest', () => {
    expect(piiEncryptionSql).toContain(
      'CREATE FUNCTION hr.sgp_encrypt_pii_text',
    );
    expect(piiEncryptionSql).toContain('pgp_sym_encrypt');
    expect(piiEncryptionSql).toContain('pgp_sym_decrypt');
    expect(piiEncryptionSql).toContain('bank_account_cipher');
    expect(piiEncryptionSql).toContain('pis_pasep_cipher');
    expect(piiEncryptionSql).toContain('account_number_cipher');
    expect(piiEncryptionSql).toContain('CREATE TRIGGER employee_pii_encrypt');
    expect(piiEncryptionSql).toContain(
      'CREATE VIEW hr.v_employee_bank_account_pii_decrypted',
    );
    expect(piiEncryptionSql).toContain("'PII_DECRYPT'");
  });

  it('leaves existing plaintext rows for owner-approved migration instead of bulk rewriting them', () => {
    expect(piiEncryptionSql).not.toMatch(
      /UPDATE\s+hr\.(employee|employee_bank_account|employee_complement_data)\s+SET/i,
    );
    expect(piiEncryptionSql).not.toMatch(
      /ALTER\s+TABLE\s+hr\.[\s\S]+ALTER\s+COLUMN[\s\S]+DROP\s+NOT\s+NULL/i,
    );
  });
});

function readSql(path: string): string {
  const root = process.cwd().endsWith('/backend')
    ? join(process.cwd(), '..')
    : process.cwd();
  return readFileSync(join(root, path), 'utf8');
}
