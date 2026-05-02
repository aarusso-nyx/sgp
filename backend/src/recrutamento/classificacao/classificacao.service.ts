import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

type QuotaBucket = 'GENERAL' | 'PCD' | 'RACIAL' | 'INDIGENOUS';

export interface ClassificationCandidateInput {
  inscricaoId: string;
  vagaId: string;
  birthDate: string;
  scores: Record<string, number>;
  requiredProvas: string[];
  minimumScores?: Record<string, number>;
  minimumTotalScore?: number;
  quotas?: {
    pcd?: boolean;
    racial?: boolean;
    indigenous?: boolean;
  };
}

export interface ClassificationVagaInput {
  vagaId: string;
  totalSeats: number;
  pcdSeats: number;
  racialSeats: number;
  indigenousSeats?: number;
}

export interface ClassificationItem {
  inscricaoId: string;
  vagaId: string;
  totalScore: string;
  rankGeneral: number | null;
  rankPcd: number | null;
  rankRacial: number | null;
  callOrder: number | null;
  allocationBucket: QuotaBucket;
  eliminatedReason: string | null;
}

interface SnapshotIdRow extends QueryResultRow {
  snapshot_id: string;
}

interface SnapshotRow extends QueryResultRow {
  id: string;
  concurso_id: string;
  generated_at: Date | string;
  status: string;
  tiebreak_rules: unknown;
}

interface SnapshotItemRow extends QueryResultRow {
  vaga_id: string;
  inscricao_id: string;
  total_score: string;
  rank_general: number | null;
  rank_pcd: number | null;
  rank_racial: number | null;
  call_order: number | null;
  allocation_bucket: QuotaBucket;
  eliminated_reason: string | null;
}

@Injectable()
export class ClassificacaoService {
  constructor(private readonly database: DatabaseService) {}

  async gerar(concursoId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.query<SnapshotIdRow>(
      'SELECT recrutamento.gerar_classificacao($1::uuid)::text AS snapshot_id',
      [concursoId],
    );
    return this.findSnapshot(rows[0].snapshot_id);
  }

  async publicar(snapshotId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const snapshot = await this.findSnapshotRow(client, snapshotId);
      if (!snapshot) throw new NotFoundException('Classificacao not found');

      await client.query(
        `
        UPDATE recrutamento.classificacao_snapshot
        SET status = 'SUPERSEDED'::recrutamento.classificacao_snapshot_status
        WHERE tenant_id = $1::uuid
          AND concurso_id = $2::uuid
          AND id <> $3::uuid
          AND status = 'PUBLISHED'::recrutamento.classificacao_snapshot_status
        `,
        [snapshot.tenant_id, snapshot.concurso_id, snapshotId],
      );
      await client.query(
        `
        UPDATE recrutamento.classificacao_snapshot
        SET status = 'PUBLISHED'::recrutamento.classificacao_snapshot_status
        WHERE tenant_id = $1::uuid
          AND id = $2::uuid
          AND status = 'DRAFT'::recrutamento.classificacao_snapshot_status
        `,
        [snapshot.tenant_id, snapshotId],
      );
      return this.findSnapshotWithClient(client, snapshotId);
    });
  }

  async publicBySlug(slug: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.query<{ classificacao: unknown }>(
      'SELECT recrutamento.get_public_classificacao($1) AS classificacao',
      [slug],
    );
    const classificacao = rows[0]?.classificacao;
    if (!classificacao) throw new NotFoundException('Classificacao not found');
    return classificacao as Record<string, unknown>;
  }

  async findSnapshot(snapshotId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction((client) =>
      this.findSnapshotWithClient(client, snapshotId),
    );
  }

  static buildGoldenClassification(
    candidates: ClassificationCandidateInput[],
    vagas: ClassificationVagaInput[],
    referenceDate = new Date(),
  ): ClassificationItem[] {
    const output: ClassificationItem[] = [];

    for (const vaga of vagas) {
      const scoped = candidates
        .filter((candidate) => candidate.vagaId === vaga.vagaId)
        .map((candidate) => {
          const totalScore = Object.values(candidate.scores).reduce(
            (sum, score) => sum + score,
            0,
          );
          const missing = candidate.requiredProvas.some(
            (provaId) => candidate.scores[provaId] === undefined,
          );
          const belowMinimum = Object.entries(
            candidate.minimumScores ?? {},
          ).some(
            ([provaId, minimum]) => (candidate.scores[provaId] ?? 0) < minimum,
          );
          const belowTotal =
            candidate.minimumTotalScore !== undefined &&
            totalScore < candidate.minimumTotalScore;
          const eliminatedReason = missing
            ? 'MISSING_REQUIRED_PROVA'
            : belowMinimum
              ? 'BELOW_MINIMUM_PROVA_SCORE'
              : belowTotal
                ? 'BELOW_MINIMUM_TOTAL_SCORE'
                : null;
          return {
            ...candidate,
            totalScore,
            isElderly: this.ageAt(candidate.birthDate, referenceDate) >= 60,
            eliminatedReason,
          };
        });

      const eligible = scoped
        .filter((candidate) => !candidate.eliminatedReason)
        .sort((left, right) => this.compareCandidates(left, right));

      const pcd = eligible.filter((candidate) => candidate.quotas?.pcd);
      const racial = eligible.filter((candidate) => candidate.quotas?.racial);
      const index = new Map<string, ClassificationItem>();

      for (const [position, candidate] of eligible.entries()) {
        const item: ClassificationItem = {
          inscricaoId: candidate.inscricaoId,
          vagaId: candidate.vagaId,
          totalScore: candidate.totalScore.toFixed(6),
          rankGeneral: position + 1,
          rankPcd: null,
          rankRacial: null,
          callOrder: null,
          allocationBucket: 'GENERAL',
          eliminatedReason: null,
        };
        index.set(candidate.inscricaoId, item);
        output.push(item);
      }

      for (const [position, candidate] of pcd.entries()) {
        const item = index.get(candidate.inscricaoId);
        if (item) item.rankPcd = position + 1;
      }
      for (const [position, candidate] of racial.entries()) {
        const item = index.get(candidate.inscricaoId);
        if (item) item.rankRacial = position + 1;
      }

      this.assignCallOrder(index, vaga);

      for (const candidate of scoped.filter((item) => item.eliminatedReason)) {
        output.push({
          inscricaoId: candidate.inscricaoId,
          vagaId: candidate.vagaId,
          totalScore: candidate.totalScore.toFixed(6),
          rankGeneral: null,
          rankPcd: null,
          rankRacial: null,
          callOrder: null,
          allocationBucket: 'GENERAL',
          eliminatedReason: candidate.eliminatedReason,
        });
      }
    }

    return output;
  }

  private static assignCallOrder(
    index: Map<string, ClassificationItem>,
    vaga: ClassificationVagaInput,
  ): void {
    let racialSeats = vaga.racialSeats;
    let pcdSeats = vaga.pcdSeats;
    const byGeneral = [...index.values()].sort(
      (left, right) => (left.rankGeneral ?? 0) - (right.rankGeneral ?? 0),
    );

    for (let callOrder = 1; callOrder <= vaga.totalSeats; callOrder += 1) {
      let selected: ClassificationItem | undefined;
      let bucket: QuotaBucket = 'GENERAL';

      if (racialSeats > 0 && callOrder >= 3 && (callOrder - 3) % 5 === 0) {
        selected = byGeneral
          .filter((item) => item.callOrder === null && item.rankRacial !== null)
          .sort(
            (left, right) => (left.rankRacial ?? 0) - (right.rankRacial ?? 0),
          )[0];
        if (selected) {
          bucket = 'RACIAL';
          racialSeats -= 1;
        }
      }

      if (
        !selected &&
        pcdSeats > 0 &&
        callOrder >= 5 &&
        (callOrder - 5) % 20 === 0
      ) {
        selected = byGeneral
          .filter((item) => item.callOrder === null && item.rankPcd !== null)
          .sort((left, right) => (left.rankPcd ?? 0) - (right.rankPcd ?? 0))[0];
        if (selected) {
          bucket = 'PCD';
          pcdSeats -= 1;
        }
      }

      selected ??= byGeneral.find((item) => item.callOrder === null);
      if (!selected) return;
      selected.callOrder = callOrder;
      selected.allocationBucket = bucket;
    }
  }

  private static compareCandidates(
    left: ClassificationCandidateInput & {
      totalScore: number;
      isElderly: boolean;
    },
    right: ClassificationCandidateInput & {
      totalScore: number;
      isElderly: boolean;
    },
  ): number {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }
    if (left.isElderly !== right.isElderly) {
      return left.isElderly ? -1 : 1;
    }
    const leftBirth = Date.parse(left.birthDate);
    const rightBirth = Date.parse(right.birthDate);
    if (leftBirth !== rightBirth) return leftBirth - rightBirth;
    return left.inscricaoId.localeCompare(right.inscricaoId);
  }

  private static ageAt(birthDate: string, referenceDate: Date): number {
    const birth = new Date(`${birthDate}T00:00:00Z`);
    let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear();
    const referenceMonth = referenceDate.getUTCMonth();
    const birthMonth = birth.getUTCMonth();
    if (
      referenceMonth < birthMonth ||
      (referenceMonth === birthMonth &&
        referenceDate.getUTCDate() < birth.getUTCDate())
    ) {
      age -= 1;
    }
    return age;
  }

  private async findSnapshotWithClient(
    client: PoolClient,
    snapshotId: string,
  ): Promise<Record<string, unknown>> {
    const snapshot = await this.findSnapshotRow(client, snapshotId);
    if (!snapshot) throw new NotFoundException('Classificacao not found');
    const items = await client.query<SnapshotItemRow>(
      `
      SELECT
        vaga_id::text,
        inscricao_id::text,
        total_score::text,
        rank_general,
        rank_pcd,
        rank_racial,
        call_order,
        allocation_bucket,
        eliminated_reason
      FROM recrutamento.classificacao_item
      WHERE tenant_id = $1::uuid AND snapshot_id = $2::uuid
      ORDER BY vaga_id, rank_general NULLS LAST, inscricao_id
      `,
      [snapshot.tenant_id, snapshotId],
    );

    return {
      id: snapshot.id,
      concursoId: snapshot.concurso_id,
      generatedAt:
        snapshot.generated_at instanceof Date
          ? snapshot.generated_at.toISOString()
          : String(snapshot.generated_at),
      status: snapshot.status,
      tiebreakRules: snapshot.tiebreak_rules,
      items: items.rows.map((item) => ({
        vagaId: item.vaga_id,
        inscricaoId: item.inscricao_id,
        totalScore: item.total_score,
        rankGeneral: item.rank_general,
        rankPcd: item.rank_pcd,
        rankRacial: item.rank_racial,
        callOrder: item.call_order,
        allocationBucket: item.allocation_bucket,
        eliminatedReason: item.eliminated_reason,
      })),
    };
  }

  private async findSnapshotRow(
    client: PoolClient,
    snapshotId: string,
  ): Promise<(SnapshotRow & { tenant_id: string }) | undefined> {
    const snapshot = await client.query<SnapshotRow & { tenant_id: string }>(
      `
      SELECT
        tenant_id::text,
        id::text,
        concurso_id::text,
        generated_at,
        status::text,
        tiebreak_rules
      FROM recrutamento.classificacao_snapshot
      WHERE id = $1::uuid
      `,
      [snapshotId],
    );
    return snapshot.rows[0];
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for classificacao',
      );
    }
  }
}
