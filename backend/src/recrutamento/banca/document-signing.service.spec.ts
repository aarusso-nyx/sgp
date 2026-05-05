import { BadRequestException } from '@nestjs/common';

import { PadesAdapter } from '../../external/signature/pades.adapter';
import { DocumentSigningService } from './document-signing.service';
import { TEST_INSTANT_2026_05_02T12_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

const tenantId = '00000000-0000-4000-8000-000000000001';
const concursoId = '00000000-0000-4000-8000-000000000901';
const documentId = '00000000-0000-4000-8000-000000000902';
const memberIds = [
  '00000000-0000-4000-8000-000000000903',
  '00000000-0000-4000-8000-000000000904',
  '00000000-0000-4000-8000-000000000905',
];

class FakeBancaDatabase {
  readonly configured = true;
  document = {
    tenant_id: tenantId,
    id: documentId,
    concurso_id: concursoId,
    kind: 'GABARITO',
    source_ref: 'gabarito-final',
    content_hash: '',
    format: 'PADES',
    signed_payload: Buffer.from('{}'),
    status: 'DRAFT',
    published_at: null,
    public_verify_token: 'token-rec-09',
  };
  members = memberIds.map((id, index) => ({
    tenant_id: tenantId,
    id,
    concurso_id: concursoId,
    full_name: `Membro ${index + 1}`,
    role: index === 0 ? 'PRESIDENTE' : 'MEMBRO',
    cert_kind: 'ICP_A1',
    cert_subject_dn: `CN=Membro ${index + 1}`,
    cert_serial: `SERIAL-${index + 1}`,
    active: true,
  }));
  signatures: Array<Record<string, unknown>> = [];

  async query<T>(sql: string, values: unknown[] = []): Promise<T[]> {
    if (sql.includes('INSERT INTO recrutamento.signed_document')) {
      this.document = {
        ...this.document,
        content_hash: values[3] as string,
        format: values[4] as 'PADES',
        signed_payload: values[5] as Buffer,
        public_verify_token: values[6] as string,
      };
      return [this.document] as T[];
    }
    if (sql.includes('WHERE public_verify_token')) {
      return [this.document] as T[];
    }
    if (sql.includes('FROM recrutamento.document_signature ds')) {
      return this.signatureRows() as T[];
    }
    return [] as T[];
  }

  async transaction<T>(
    callback: (client: { query: jest.Mock }) => Promise<T>,
  ): Promise<T> {
    const client = {
      query: jest.fn(async (sql: string, values: unknown[] = []) => {
        if (sql.includes('FOR UPDATE') && sql.includes('signed_document')) {
          return { rows: [this.document] };
        }
        if (sql.includes('FOR UPDATE') && sql.includes('banca_membro')) {
          return {
            rows: [this.members.find((member) => member.id === values[1])],
          };
        }
        if (sql.includes('FROM recrutamento.document_signature ds')) {
          return { rows: this.signatureRows() };
        }
        if (sql.includes('INSERT INTO recrutamento.document_signature')) {
          this.signatures.push({
            id: `signature-${this.signatures.length + 1}`,
            banca_membro_id: values[2],
            signed_at: new Date(TEST_INSTANT_2026_05_02T12_00_00_000Z),
            signature_value: values[3],
            signature_order: values[6],
          });
          return { rows: [] };
        }
        if (sql.includes('UPDATE recrutamento.signed_document')) {
          this.document = {
            ...this.document,
            signed_payload: values[2] as Buffer,
            content_hash: values[3] as string,
            status: values[4] as string,
          };
          return { rows: [this.document] };
        }
        return { rows: [] };
      }),
    };
    return callback(client);
  }

  private signatureRows() {
    return this.signatures.map((signature) => {
      const member = this.members.find(
        (candidate) => candidate.id === signature.banca_membro_id,
      );
      return { ...signature, ...member };
    });
  }
}

describe('DocumentSigningService', () => {
  it('preserves sequential signatures for three banca members', async () => {
    const database = new FakeBancaDatabase();
    const service = new DocumentSigningService(
      database as never,
      new PadesAdapter(),
    );
    await service.create({
      concursoId,
      kind: 'GABARITO',
      sourceRef: 'gabarito-final',
      format: 'PADES',
      payloadBase64: Buffer.from('PDF').toString('base64'),
    });

    for (const bancaMembroId of memberIds) {
      await service.sign(documentId, { bancaMembroId });
    }

    expect(
      database.signatures.map((signature) => signature.signature_order),
    ).toEqual([1, 2, 3]);
    const verified = await service.publicVerify('token-rec-09');
    expect(verified.valid).toBe(true);
    expect(verified.signers).toHaveLength(3);
  });

  it('detects tampering after signature', async () => {
    const database = new FakeBancaDatabase();
    const service = new DocumentSigningService(
      database as never,
      new PadesAdapter(),
    );
    await service.create({
      concursoId,
      kind: 'GABARITO',
      sourceRef: 'gabarito-final',
      format: 'PADES',
      payloadBase64: Buffer.from('PDF').toString('base64'),
    });
    await service.sign(documentId, { bancaMembroId: memberIds[0] });
    const envelope = JSON.parse(
      database.document.signed_payload.toString('utf8'),
    );
    envelope.payloadBase64 = Buffer.from('tampered PDF').toString('base64');
    database.document.signed_payload = Buffer.from(
      JSON.stringify(envelope),
      'utf8',
    );

    const verified = await service.publicVerify('token-rec-09');

    expect(verified.valid).toBe(false);
  });

  it('rejects a revoked certificate during the flow', async () => {
    const database = new FakeBancaDatabase();
    database.members[0].cert_serial = 'REVOKED-1';
    const service = new DocumentSigningService(
      database as never,
      new PadesAdapter(),
    );

    await expect(
      service.sign(documentId, { bancaMembroId: memberIds[0] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
