import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { ExemptionService } from './exemption.service';
import type { ExemptionDecision } from './exemption.service';
import type { CreateInscricaoDto } from './inscricao.dto';
import { PAYMENT_GATEWAY } from './payment-gateway/payment-gateway.port';
import type {
  PaymentChargeResult,
  PaymentGatewayPort,
} from './payment-gateway/payment-gateway.port';

interface PublicConcursoRow extends QueryResultRow {
  concurso: {
    id: string;
    tenantId: string;
    vagas: PublicVaga[];
  } | null;
}

interface PublicVaga {
  positionId: string;
  requirement?: Record<string, unknown> | undefined;
  baseSalary: string;
}

interface CreatedInscricaoRow extends QueryResultRow {
  id: string;
  status: string;
  candidato_id: string;
}

interface PublicInscricaoRow extends QueryResultRow {
  id: string;
  status: string;
  exemption_kind: string;
  full_name: string;
  payment_charge_id: string | null;
  gateway: string | null;
  external_id: string | null;
}

export interface InscricaoResult {
  id: string;
  status: string;
  token: string;
  payment: PaymentChargeResult | null;
}

@Injectable()
export class InscricaoService {
  constructor(
    private readonly database: DatabaseService,
    private readonly exemptionService: ExemptionService,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  validateRequirements(
    requirement: Record<string, unknown>,
    candidate: CreateInscricaoDto['candidate'],
    evidence: Record<string, unknown>,
  ): void {
    if (!this.isValidCpf(candidate.cpf)) {
      throw new UnprocessableEntityException('Invalid CPF');
    }

    const minAge = this.asNumber(requirement.minAge);
    if (
      minAge !== null &&
      this.ageAt(candidate.birthDate, new Date()) < minAge
    ) {
      throw new UnprocessableEntityException('Candidate age is below minimum');
    }

    const requiredEducation = this.asText(requirement.education);
    if (
      requiredEducation &&
      this.asText(evidence.education) !== requiredEducation
    ) {
      throw new UnprocessableEntityException(
        'Candidate education does not meet requirement',
      );
    }

    if (
      requirement.professionalRegistry === true &&
      !this.asText(evidence.professionalRegistry)
    ) {
      throw new UnprocessableEntityException(
        'Professional registry is required',
      );
    }
  }

  validateQuotaSelfDeclaration(
    quotaSelfDeclaration: Record<string, unknown> | undefined,
  ): void {
    if (!quotaSelfDeclaration) return;
    const allowed = ['pcd', 'racial', 'indigenous'];
    for (const key of Object.keys(quotaSelfDeclaration)) {
      if (!allowed.includes(key)) {
        throw new UnprocessableEntityException(
          'Unsupported quota self-declaration',
        );
      }
      if (quotaSelfDeclaration[key] !== true) {
        throw new UnprocessableEntityException(
          'Quota self-declaration must be explicit',
        );
      }
    }
  }

  async create(
    slug: string,
    input: CreateInscricaoDto,
  ): Promise<InscricaoResult> {
    this.ensureDatabase();
    if (!input.lgpdConsent) {
      throw new UnprocessableEntityException('LGPD consent is required');
    }

    const concurso = await this.findPublicConcurso(slug);
    const vaga = concurso.vagas.find(
      (item) => item.positionId === input.vagaId,
    );
    if (!vaga) throw new NotFoundException('Vaga not found');

    const requirement = vaga.requirement ?? {};
    const applicationFee = this.asText(requirement.applicationFee) ?? '100.00';
    this.validateRequirements(requirement, input.candidate, input.requirements);
    this.validateQuotaSelfDeclaration(input.quotaSelfDeclaration);
    const exemption = this.exemptionService.decide(input.exemption);
    const token = randomBytes(24).toString('base64url');
    const tokenHash = this.hashToken(token);

    return this.database.transaction(async (client) => {
      await this.applyPortalMutationContext(client, concurso.tenantId);
      const created = await this.insertInscricao(
        client,
        concurso.id,
        input,
        exemption,
        tokenHash,
      );
      AuditMutationContextStore.markMutationAudited();

      if (exemption.exempt) {
        return {
          id: created.id,
          status: created.status,
          token,
          payment: null,
        };
      }

      const payment = await this.paymentGateway.createCharge({
        inscricaoId: created.id,
        amount: applicationFee,
        candidateCpf: input.candidate.cpf,
        candidateName: input.candidate.fullName,
      });
      const charge = await client.query<{ id: string }>(
        `
        INSERT INTO recrutamento.payment_charge (
          tenant_id, inscricao_id, gateway, amount, external_id, status
        )
        VALUES ($1::uuid, $2::uuid, $3::recrutamento.payment_gateway_kind, $4::numeric(14,2), $5, 'OPEN')
        RETURNING id::text
        `,
        [
          concurso.tenantId,
          created.id,
          payment.gateway,
          payment.amount,
          payment.externalId,
        ],
      );
      await client.query(
        `
        UPDATE recrutamento.inscricao
        SET payment_charge_id = $3,
            status = 'PENDING_PAYMENT'::recrutamento.inscricao_status
        WHERE tenant_id = $1::uuid AND id = $2::uuid
        `,
        [concurso.tenantId, created.id, charge.rows[0]!.id],
      );
      return {
        id: created.id,
        status: 'PENDING_PAYMENT',
        token,
        payment,
      };
    });
  }

  async getPublic(id: string, token: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.bypass_rls',
        'true',
      ]);
      return client.query<PublicInscricaoRow>(
        `
        SELECT
          i.id::text,
          i.status::text,
          i.exemption_kind::text,
          c.full_name,
          i.payment_charge_id,
          pc.gateway::text,
          pc.external_id
        FROM recrutamento.inscricao i
        JOIN recrutamento.candidato c ON c.tenant_id = i.tenant_id AND c.id = i.candidato_id
        LEFT JOIN recrutamento.payment_charge pc ON pc.tenant_id = i.tenant_id AND pc.id::text = i.payment_charge_id
        WHERE i.id = $1::uuid
          AND i.access_token_hash = $2
        `,
        [id, this.hashToken(token)],
      );
    });
    const row = rows.rows[0];
    if (!row) throw new NotFoundException('Inscricao not found');
    return {
      id: row.id,
      status: row.status,
      exemptionKind: row.exemption_kind,
      candidateName: row.full_name,
      paymentChargeId: row.payment_charge_id,
      paymentGateway: row.gateway,
      paymentExternalId: row.external_id,
    };
  }

  private async findPublicConcurso(
    slug: string,
  ): Promise<NonNullable<PublicConcursoRow['concurso']>> {
    const rows = await this.database.query<PublicConcursoRow>(
      'SELECT recrutamento.get_public_concurso($1) AS concurso',
      [slug],
    );
    const concurso = rows[0]?.concurso;
    if (!concurso) throw new NotFoundException('Concurso not found');
    return concurso;
  }

  private async insertInscricao(
    client: PoolClient,
    concursoId: string,
    input: CreateInscricaoDto,
    exemption: ExemptionDecision,
    tokenHash: string,
  ): Promise<CreatedInscricaoRow> {
    const rows = await client.query<CreatedInscricaoRow>(
      `
      WITH candidate AS (
        INSERT INTO recrutamento.candidato (
          tenant_id, cpf, full_name, birth_date, email, phone, address,
          lgpd_consent_at, lgpd_consent_version
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          $3::date,
          $4,
          $5,
          $6::jsonb,
          now(),
          $7
        )
        ON CONFLICT (tenant_id, cpf) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            birth_date = EXCLUDED.birth_date,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            lgpd_consent_at = EXCLUDED.lgpd_consent_at,
            lgpd_consent_version = EXCLUDED.lgpd_consent_version
        RETURNING id
      )
      INSERT INTO recrutamento.inscricao (
        tenant_id, concurso_id, vaga_id, candidato_id, status, exemption_kind,
        exemption_evidence_ref, access_token_hash, quota_self_declaration
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        $8::uuid,
        $9::uuid,
        candidate.id,
        $10::recrutamento.inscricao_status,
        $11::recrutamento.exemption_kind,
        $12,
        $13,
        $14::jsonb
      FROM candidate
      RETURNING id::text, status::text, candidato_id::text
      `,
      [
        input.candidate.cpf,
        input.candidate.fullName.trim(),
        input.candidate.birthDate,
        input.candidate.email.trim(),
        input.candidate.phone.trim(),
        JSON.stringify(input.candidate.address),
        input.lgpdConsentVersion.trim(),
        concursoId,
        input.vagaId,
        exemption.exempt ? 'EXEMPT' : 'DRAFT',
        exemption.kind,
        exemption.evidenceRef,
        tokenHash,
        JSON.stringify(input.quotaSelfDeclaration ?? {}),
      ],
    );
    return rows.rows[0]!;
  }

  private async applyPortalMutationContext(
    client: PoolClient,
    tenantId: string,
  ): Promise<void> {
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_tenant_id',
      tenantId,
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_tenant',
      tenantId,
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_permissions',
      'recrutamento.write',
    ]);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private ageAt(birthDate: string, now: Date): number {
    const birth = new Date(`${birthDate}T00:00:00.000Z`);
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
    if (
      monthDelta < 0 ||
      (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())
    ) {
      age -= 1;
    }
    return age;
  }

  private isValidCpf(cpf: string): boolean {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
    const digits = cpf.split('').map(Number);
    const calc = (factor: number) => {
      const sum = digits
        .slice(0, factor - 1)
        .reduce((acc, digit, index) => acc + digit * (factor - index), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return calc(10) === digits[9] && calc(11) === digits[10];
  }

  private asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (
      typeof value === 'string' &&
      value.trim() &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
    return null;
  }

  private asText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for inscricao',
      );
    }
  }
}
