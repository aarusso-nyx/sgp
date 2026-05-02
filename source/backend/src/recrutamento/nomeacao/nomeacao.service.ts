import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

type ConvocacaoChannel = 'PUBLICACAO_OFICIAL' | 'EMAIL' | 'POSTAL';

interface ConcursoRow extends QueryResultRow {
  tenant_id: string;
  id: string;
  valid_until: Date | string;
}

interface NextCallRow extends QueryResultRow {
  tenant_id: string;
  concurso_id: string;
  vaga_id: string;
  inscricao_id: string;
  call_order: number;
  allocation_bucket: string;
  rank_general: number;
}

interface NomeacaoRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  concurso_id: string;
  vaga_id: string;
  inscricao_id: string;
  ato_administrativo: string;
  published_at: Date | string;
  comparecimento_until: Date | string;
  status: string;
}

interface ConvocacaoRow extends QueryResultRow {
  id: string;
  nomeacao_id: string;
  channel: ConvocacaoChannel;
  sent_at: Date | string;
  evidence_ref: string;
}

interface EmailRecipientRow extends QueryResultRow {
  email: string;
}

@Injectable()
export class NomeacaoService {
  constructor(private readonly database: DatabaseService) {}

  async nomear(input: {
    concursoId: string;
    vagaId: string;
    count: number;
    atoAdministrativo: string;
    publishedAt?: string;
  }): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const concurso = await this.findConcurso(client, input.concursoId);
      if (!concurso) throw new NotFoundException('Concurso not found');
      if (this.isAfterValidUntil(concurso.valid_until, input.publishedAt)) {
        throw new UnprocessableEntityException(
          'Nomeacao after concurso valid_until is not allowed',
        );
      }

      const created: NomeacaoRow[] = [];
      for (let index = 0; index < input.count; index += 1) {
        const next = await this.nextCall(
          client,
          input.concursoId,
          input.vagaId,
        );
        if (!next) break;
        const rows = await client.query<NomeacaoRow>(
          `
          INSERT INTO recrutamento.nomeacao (
            tenant_id,
            concurso_id,
            vaga_id,
            inscricao_id,
            ato_administrativo,
            published_at,
            comparecimento_until,
            status
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::uuid,
            $5,
            COALESCE($6::timestamptz, now()),
            (COALESCE($6::timestamptz, now())::date + INTERVAL '30 days')::date,
            'NOMEADO'::recrutamento.nomeacao_status
          )
          RETURNING
            id::text,
            tenant_id::text,
            concurso_id::text,
            vaga_id::text,
            inscricao_id::text,
            ato_administrativo,
            published_at,
            comparecimento_until,
            status::text
          `,
          [
            next.tenant_id,
            next.concurso_id,
            next.vaga_id,
            next.inscricao_id,
            input.atoAdministrativo,
            input.publishedAt ?? null,
          ],
        );
        created.push(rows.rows[0]);
      }

      return { nomeacoes: created.map((row) => this.mapNomeacao(row)) };
    });
  }

  async convocar(
    nomeacaoId: string,
    input: { channel: ConvocacaoChannel; evidenceRef?: string },
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const nomeacao = await this.findNomeacao(client, nomeacaoId);
      if (!nomeacao) throw new NotFoundException('Nomeacao not found');
      const evidenceRef =
        input.channel === 'EMAIL'
          ? await this.emailEvidenceRef(client, nomeacao)
          : this.requireManualEvidence(input.channel, input.evidenceRef);

      const convocacao = await client.query<ConvocacaoRow>(
        `
        INSERT INTO recrutamento.convocacao (
          tenant_id,
          nomeacao_id,
          channel,
          evidence_ref
        )
        VALUES ($1::uuid, $2::uuid, $3::recrutamento.convocacao_channel, $4)
        RETURNING id::text, nomeacao_id::text, channel::text, sent_at, evidence_ref
        `,
        [nomeacao.tenant_id, nomeacao.id, input.channel, evidenceRef],
      );
      const updated = await client.query<NomeacaoRow>(
        `
        UPDATE recrutamento.nomeacao
        SET status = 'CONVOCADO'::recrutamento.nomeacao_status
        WHERE tenant_id = $1::uuid
          AND id = $2::uuid
          AND status = 'NOMEADO'::recrutamento.nomeacao_status
        RETURNING
          id::text,
          tenant_id::text,
          concurso_id::text,
          vaga_id::text,
          inscricao_id::text,
          ato_administrativo,
          published_at,
          comparecimento_until,
          status::text
        `,
        [nomeacao.tenant_id, nomeacao.id],
      );
      return {
        nomeacao: this.mapNomeacao(updated.rows[0] ?? nomeacao),
        convocacao: this.mapConvocacao(convocacao.rows[0]),
      };
    });
  }

  async marcarDesistencia(
    nomeacaoId: string,
  ): Promise<Record<string, unknown>> {
    return this.updateStatus(nomeacaoId, 'DESISTENTE');
  }

  async expirarPrazo(nomeacaoId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const before = await this.findNomeacao(client, nomeacaoId);
      if (!before) throw new NotFoundException('Nomeacao not found');
      await client.query(
        'SELECT recrutamento.expirar_prazo_nomeacao($1::uuid) AS expired',
        [nomeacaoId],
      );
      const after = await this.findNomeacao(client, nomeacaoId);
      return {
        expired: after?.status === 'EXONERADO_POR_NAO_POSSE',
        nomeacao: this.mapNomeacao(after ?? before),
      };
    });
  }

  async expireOverdue(limit = 100): Promise<{
    scanned: number;
    expired: number;
  }> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const rows = await client.query<{ id: string }>(
        `
        SELECT id::text
        FROM recrutamento.nomeacao
        WHERE comparecimento_until < CURRENT_DATE
          AND status IN ('NOMEADO', 'CONVOCADO')
        ORDER BY comparecimento_until ASC, created_at ASC
        LIMIT $1
        `,
        [limit],
      );
      let expired = 0;
      for (const row of rows.rows) {
        const result = await client.query<{ expired: boolean }>(
          'SELECT recrutamento.expirar_prazo_nomeacao($1::uuid) AS expired',
          [row.id],
        );
        if (result.rows[0]?.expired) expired += 1;
      }
      return { scanned: rows.rows.length, expired };
    });
  }

  static nextCall(
    candidates: Array<{
      inscricaoId: string;
      callOrder: number;
      allocationBucket: string;
      alreadyCalled?: boolean;
    }>,
  ): string | null {
    const next = [...candidates]
      .filter((candidate) => !candidate.alreadyCalled)
      .sort(
        (left, right) =>
          left.callOrder - right.callOrder ||
          left.inscricaoId.localeCompare(right.inscricaoId),
      )[0];
    return next?.inscricaoId ?? null;
  }

  private async updateStatus(
    nomeacaoId: string,
    status: 'DESISTENTE',
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.query<NomeacaoRow>(
      `
      UPDATE recrutamento.nomeacao
      SET status = $2::recrutamento.nomeacao_status
      WHERE id = $1::uuid
        AND status IN ('NOMEADO', 'CONVOCADO')
      RETURNING
        id::text,
        tenant_id::text,
        concurso_id::text,
        vaga_id::text,
        inscricao_id::text,
        ato_administrativo,
        published_at,
        comparecimento_until,
        status::text
      `,
      [nomeacaoId, status],
    );
    if (!rows[0]) throw new NotFoundException('Nomeacao not found');
    return this.mapNomeacao(rows[0]);
  }

  private async findConcurso(
    client: PoolClient,
    concursoId: string,
  ): Promise<ConcursoRow | null> {
    const rows = await client.query<ConcursoRow>(
      `
      SELECT tenant_id::text, id::text, valid_until
      FROM recrutamento.concurso
      WHERE id = $1::uuid
      `,
      [concursoId],
    );
    return rows.rows[0] ?? null;
  }

  private async nextCall(
    client: PoolClient,
    concursoId: string,
    vagaId: string,
  ): Promise<NextCallRow | null> {
    const rows = await client.query<NextCallRow>(
      `
      SELECT
        tenant_id::text,
        concurso_id::text,
        vaga_id::text,
        inscricao_id::text,
        call_order,
        allocation_bucket,
        rank_general
      FROM recrutamento.proxima_chamada($1::uuid, $2::uuid)
      `,
      [concursoId, vagaId],
    );
    return rows.rows[0] ?? null;
  }

  private async findNomeacao(
    client: PoolClient,
    nomeacaoId: string,
  ): Promise<NomeacaoRow | null> {
    const rows = await client.query<NomeacaoRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        concurso_id::text,
        vaga_id::text,
        inscricao_id::text,
        ato_administrativo,
        published_at,
        comparecimento_until,
        status::text
      FROM recrutamento.nomeacao
      WHERE id = $1::uuid
      `,
      [nomeacaoId],
    );
    return rows.rows[0] ?? null;
  }

  private async emailEvidenceRef(
    client: PoolClient,
    nomeacao: NomeacaoRow,
  ): Promise<string> {
    const rows = await client.query<EmailRecipientRow>(
      `
      SELECT c.email
      FROM recrutamento.inscricao i
      JOIN recrutamento.candidato c ON c.tenant_id = i.tenant_id AND c.id = i.candidato_id
      WHERE i.tenant_id = $1::uuid
        AND i.id = $2::uuid
      `,
      [nomeacao.tenant_id, nomeacao.inscricao_id],
    );
    const recipient = rows.rows[0]?.email;
    if (!recipient)
      throw new UnprocessableEntityException('Candidate email not found');
    return `email:messageId=local-${nomeacao.id}-${Date.now()}`;
  }

  private requireManualEvidence(
    channel: ConvocacaoChannel,
    evidenceRef?: string,
  ): string {
    const normalized = evidenceRef?.trim();
    if (!normalized) {
      throw new UnprocessableEntityException(
        `${channel} convocacao requires evidenceRef`,
      );
    }
    return normalized;
  }

  private isAfterValidUntil(
    validUntil: Date | string,
    publishedAt?: string,
  ): boolean {
    const reference = publishedAt ? new Date(publishedAt) : new Date();
    const valid =
      validUntil instanceof Date ? validUntil : new Date(validUntil);
    reference.setHours(0, 0, 0, 0);
    valid.setHours(0, 0, 0, 0);
    return reference.getTime() > valid.getTime();
  }

  private mapNomeacao(row: NomeacaoRow): Record<string, unknown> {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      concursoId: row.concurso_id,
      vagaId: row.vaga_id,
      inscricaoId: row.inscricao_id,
      atoAdministrativo: row.ato_administrativo,
      publishedAt: row.published_at,
      comparecimentoUntil: row.comparecimento_until,
      status: row.status,
    };
  }

  private mapConvocacao(row: ConvocacaoRow): Record<string, unknown> {
    return {
      id: row.id,
      nomeacaoId: row.nomeacao_id,
      channel: row.channel,
      sentAt: row.sent_at,
      evidenceRef: row.evidence_ref,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for nomeacao',
      );
    }
  }
}
