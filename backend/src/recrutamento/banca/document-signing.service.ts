import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { PadesAdapter } from '../../external/signature/pades.adapter';
import type { CreateSignedDocumentDto, SignDocumentDto } from './banca.dto';

interface DocumentRow extends QueryResultRow {
  tenant_id: string;
  id: string;
  concurso_id: string;
  kind: string;
  source_ref: string;
  content_hash: string;
  format: 'XADES' | 'PADES';
  signed_payload: Buffer;
  status: string;
  published_at: Date | string | null;
  public_verify_token: string;
}

interface MemberRow extends QueryResultRow {
  tenant_id: string;
  id: string;
  concurso_id: string;
  full_name: string;
  role: string;
  cert_kind: string;
  cert_subject_dn: string | null;
  cert_serial: string | null;
  active: boolean;
}

interface SignatureRow extends QueryResultRow {
  id: string;
  banca_membro_id: string;
  signed_at: Date | string;
  signature_order: number;
  full_name: string;
  role: string;
  cert_kind: string;
  cert_subject_dn: string | null;
  cert_serial: string | null;
  signature_value: Buffer;
}

interface Envelope {
  format: 'XADES' | 'PADES';
  payloadBase64: string;
  signatures: Array<{
    memberId: string;
    subject: string;
    serial: string;
    digest: string;
  }>;
}

@Injectable()
export class DocumentSigningService {
  constructor(
    private readonly database: DatabaseService,
    private readonly padesAdapter: PadesAdapter,
  ) {}

  async create(input: CreateSignedDocumentDto) {
    this.ensureDatabase();
    const token = this.publicToken(input);
    const verifyUrl = `/publico/banca/verify/${token}`;
    const rawPayload = Buffer.from(input.payloadBase64, 'base64');
    const payload =
      input.format === 'PADES'
        ? await this.padesAdapter.embedVerificationHint({
            payload: rawPayload,
            verifyUrl,
          })
        : this.embedXmlVerificationHint(rawPayload, verifyUrl);
    const envelope = this.encodeEnvelope({
      format: input.format,
      payloadBase64: payload.toString('base64'),
      signatures: [],
    });
    const hash = this.sha256(envelope);
    const rows = await this.database.query<DocumentRow>(
      `
      INSERT INTO recrutamento.signed_document (
        tenant_id, concurso_id, kind, source_ref, content_hash, format, signed_payload, public_verify_token
      )
      SELECT c.tenant_id, c.id, $2::recrutamento.signed_document_kind, $3, $4, $5::recrutamento.signed_document_format, $6::bytea, $7
      FROM recrutamento.concurso c
      WHERE c.id = $1::uuid
      RETURNING tenant_id::text, id::text, concurso_id::text, kind::text, source_ref, content_hash, format::text, signed_payload, status::text, published_at, public_verify_token
      `,
      [
        input.concursoId,
        input.kind,
        input.sourceRef,
        hash,
        input.format,
        envelope,
        token,
      ],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Concurso not found');
    AuditMutationContextStore.markMutationAudited();
    return this.toDocument(row, []);
  }

  async sign(documentId: string, input: SignDocumentDto) {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const document = await this.findDocumentForUpdate(client, documentId);
      if (!document) throw new NotFoundException('Signed document not found');
      if (document.status === 'PUBLISHED') {
        throw new BadRequestException('Published documents cannot be signed');
      }
      const member = await this.findMemberForUpdate(
        client,
        document.tenant_id,
        input.bancaMembroId,
      );
      if (!member || member.concurso_id !== document.concurso_id) {
        throw new NotFoundException('Banca member not found');
      }
      if (!member.active) {
        throw new BadRequestException('Inactive banca member cannot sign');
      }
      this.validateCertificate(member);

      const existing = await this.signatures(
        client,
        document.tenant_id,
        document.id,
      );
      const order = existing.length + 1;
      const envelope = this.decodeEnvelope(document.signed_payload);
      const digest = this.signatureDigest(
        document.signed_payload,
        member,
        order,
      );
      envelope.signatures.push({
        memberId: member.id,
        subject: member.cert_subject_dn ?? member.full_name,
        serial: member.cert_serial ?? member.id,
        digest,
      });
      const signedPayload = this.encodeEnvelope(envelope);
      const contentHash = this.sha256(signedPayload);
      const status = order >= 3 ? 'SIGNED' : 'PARTIALLY_SIGNED';

      await client.query(
        `
        INSERT INTO recrutamento.document_signature (
          tenant_id, document_id, banca_membro_id, signature_value, cert_chain, ts_token, signature_order
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::bytea, $5::bytea, $6::bytea, $7)
        `,
        [
          document.tenant_id,
          document.id,
          member.id,
          Buffer.from(digest, 'utf8'),
          input.certChainBase64
            ? Buffer.from(input.certChainBase64, 'base64')
            : Buffer.from(member.cert_subject_dn ?? member.full_name, 'utf8'),
          input.tsTokenBase64
            ? Buffer.from(input.tsTokenBase64, 'base64')
            : null,
          order,
        ],
      );
      const updatedRows = await client.query<DocumentRow>(
        `
        UPDATE recrutamento.signed_document
        SET signed_payload = $3::bytea,
            content_hash = $4,
            status = $5::recrutamento.signed_document_status
        WHERE tenant_id = $1::uuid
          AND id = $2::uuid
        RETURNING tenant_id::text, id::text, concurso_id::text, kind::text, source_ref, content_hash, format::text, signed_payload, status::text, published_at, public_verify_token
        `,
        [document.tenant_id, document.id, signedPayload, contentHash, status],
      );
      AuditMutationContextStore.markMutationAudited();
      return this.toDocument(
        updatedRows.rows[0],
        await this.signatures(client, document.tenant_id, document.id),
      );
    });
  }

  async publish(documentId: string) {
    this.ensureDatabase();
    const rows = await this.database.query<DocumentRow>(
      `
      UPDATE recrutamento.signed_document
      SET status = 'PUBLISHED'::recrutamento.signed_document_status,
          published_at = now()
      WHERE id = $1::uuid
        AND status = 'SIGNED'::recrutamento.signed_document_status
      RETURNING tenant_id::text, id::text, concurso_id::text, kind::text, source_ref, content_hash, format::text, signed_payload, status::text, published_at, public_verify_token
      `,
      [documentId],
    );
    const row = rows[0];
    if (!row) {
      throw new BadRequestException(
        'Only fully signed documents can be published',
      );
    }
    AuditMutationContextStore.markMutationAudited();
    return this.toDocument(row, []);
  }

  async publicVerify(token: string) {
    this.ensureDatabase();
    const { row, signatures } = await this.withPublicVerificationBypass(
      async () => {
        const rows = await this.database.query<DocumentRow>(
          `
          SELECT tenant_id::text, id::text, concurso_id::text, kind::text, source_ref, content_hash, format::text, signed_payload, status::text, published_at, public_verify_token
          FROM recrutamento.signed_document
          WHERE public_verify_token = $1
            AND status IN ('SIGNED', 'PUBLISHED')
          `,
          [token],
        );
        const row = rows[0];
        if (!row) throw new NotFoundException('Signed document not found');
        const signatures = await this.database.query<SignatureRow>(
          `
          SELECT ds.id::text, ds.banca_membro_id::text, ds.signed_at, ds.signature_order,
                 bm.full_name, bm.role::text, bm.cert_kind::text, bm.cert_subject_dn, bm.cert_serial,
                 ds.signature_value
          FROM recrutamento.document_signature ds
          JOIN recrutamento.banca_membro bm
            ON bm.tenant_id = ds.tenant_id
           AND bm.id = ds.banca_membro_id
          WHERE ds.tenant_id = $1::uuid
            AND ds.document_id = $2::uuid
          ORDER BY ds.signature_order
          `,
          [row.tenant_id, row.id],
        );
        return { row, signatures };
      },
    );
    return {
      token: row.public_verify_token,
      kind: row.kind,
      format: row.format,
      contentHash: row.content_hash,
      status: row.status,
      publishedAt: this.iso(row.published_at),
      valid: this.verifyPayload(row.signed_payload, signatures),
      signers: signatures.map((signature) => ({
        name: signature.full_name,
        role: signature.role,
        certKind: signature.cert_kind,
        signedAt: this.iso(signature.signed_at),
        chainStatus: this.certificateStatus(signature),
      })),
    };
  }

  private async withPublicVerificationBypass<T>(
    callback: () => Promise<T>,
  ): Promise<T> {
    const context = RequestContextStore.get();
    if (!context) return callback();
    const previousBypass = context.bypassRls;
    const previousReason = context.bypassRlsReason;
    context.bypassRls = true;
    context.bypassRlsReason = 'public-banca-verify';
    try {
      return await callback();
    } finally {
      context.bypassRls = previousBypass;
      context.bypassRlsReason = previousReason;
    }
  }

  verifyTamperedPayload(payload: Buffer, signatures: SignatureRow[]): boolean {
    return this.verifyPayload(payload, signatures);
  }

  private async findDocumentForUpdate(client: PoolClient, documentId: string) {
    const result = await client.query<DocumentRow>(
      `
      SELECT tenant_id::text, id::text, concurso_id::text, kind::text, source_ref, content_hash, format::text, signed_payload, status::text, published_at, public_verify_token
      FROM recrutamento.signed_document
      WHERE id = $1::uuid
      FOR UPDATE
      `,
      [documentId],
    );
    return result.rows[0];
  }

  private async findMemberForUpdate(
    client: PoolClient,
    tenantId: string,
    memberId: string,
  ) {
    const result = await client.query<MemberRow>(
      `
      SELECT tenant_id::text, id::text, concurso_id::text, full_name, role::text, cert_kind::text, cert_subject_dn, cert_serial, active
      FROM recrutamento.banca_membro
      WHERE tenant_id = $1::uuid
        AND id = $2::uuid
      FOR UPDATE
      `,
      [tenantId, memberId],
    );
    return result.rows[0];
  }

  private async signatures(
    client: PoolClient,
    tenantId: string,
    documentId: string,
  ) {
    const result = await client.query<SignatureRow>(
      `
      SELECT ds.id::text, ds.banca_membro_id::text, ds.signed_at, ds.signature_order,
             bm.full_name, bm.role::text, bm.cert_kind::text, bm.cert_subject_dn, bm.cert_serial,
             ds.signature_value
      FROM recrutamento.document_signature ds
      JOIN recrutamento.banca_membro bm
        ON bm.tenant_id = ds.tenant_id
       AND bm.id = ds.banca_membro_id
      WHERE ds.tenant_id = $1::uuid
        AND ds.document_id = $2::uuid
      ORDER BY ds.signature_order
      `,
      [tenantId, documentId],
    );
    return result.rows;
  }

  private validateCertificate(member: MemberRow): void {
    const serial = member.cert_serial ?? '';
    const subject = member.cert_subject_dn ?? '';
    if (serial.startsWith('REVOKED') || subject.includes('REVOKED')) {
      throw new BadRequestException('Certificate chain is revoked');
    }
  }

  private verifyPayload(payload: Buffer, signatures: SignatureRow[]): boolean {
    try {
      const finalEnvelope = this.decodeEnvelope(payload);
      if (finalEnvelope.signatures.length !== signatures.length) return false;
      const replay: Envelope = {
        format: finalEnvelope.format,
        payloadBase64: finalEnvelope.payloadBase64,
        signatures: [],
      };
      for (const [index, signature] of signatures.entries()) {
        const expectedDigest = this.signatureDigest(
          this.encodeEnvelope(replay),
          {
            id: signature.banca_membro_id,
            cert_serial: signature.cert_serial,
          } as MemberRow,
          signature.signature_order,
        );
        const actualDigest = signature.signature_value.toString('utf8');
        if (
          expectedDigest !== actualDigest ||
          finalEnvelope.signatures[index].digest !== actualDigest
        ) {
          return false;
        }
        replay.signatures.push(finalEnvelope.signatures[index]);
      }
      return true;
    } catch {
      return false;
    }
  }

  private certificateStatus(signature: SignatureRow): 'VALID' | 'REVOKED' {
    return signature.cert_serial?.startsWith('REVOKED') ||
      signature.cert_subject_dn?.includes('REVOKED')
      ? 'REVOKED'
      : 'VALID';
  }

  private embedXmlVerificationHint(payload: Buffer, verifyUrl: string): Buffer {
    return Buffer.from(
      `${payload.toString('utf8')}\n<!-- SGP-VERIFY-QR:${verifyUrl} -->`,
      'utf8',
    );
  }

  private publicToken(input: CreateSignedDocumentDto): string {
    return this.sha256(
      Buffer.from(
        `${input.concursoId}:${input.kind}:${input.sourceRef}:${Date.now()}`,
      ),
    ).slice(0, 48);
  }

  private signatureDigest(
    payload: Buffer,
    member: MemberRow,
    order: number,
  ): string {
    return this.sha256(
      Buffer.concat([
        payload,
        Buffer.from(
          `:${member.id}:${member.cert_serial ?? ''}:${order}`,
          'utf8',
        ),
      ]),
    );
  }

  private sha256(payload: Buffer): string {
    return createHash('sha256').update(payload).digest('hex');
  }

  private encodeEnvelope(envelope: Envelope): Buffer {
    return Buffer.from(JSON.stringify(envelope), 'utf8');
  }

  private decodeEnvelope(payload: Buffer): Envelope {
    return JSON.parse(payload.toString('utf8')) as Envelope;
  }

  private toDocument(row: DocumentRow, signatures: SignatureRow[]) {
    return {
      id: row.id,
      concursoId: row.concurso_id,
      kind: row.kind,
      sourceRef: row.source_ref,
      contentHash: row.content_hash,
      format: row.format,
      status: row.status,
      publicVerifyToken: row.public_verify_token,
      publishedAt: this.iso(row.published_at),
      signatures: signatures.map((signature) => ({
        id: signature.id,
        bancaMembroId: signature.banca_membro_id,
        signedAt: this.iso(signature.signed_at),
        order: signature.signature_order,
        signerName: signature.full_name,
      })),
    };
  }

  private iso(value: Date | string | null): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : String(value);
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
