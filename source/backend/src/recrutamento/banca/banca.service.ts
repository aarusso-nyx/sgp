import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import type { CreateBancaMembroDto } from './banca.dto';

interface BancaMembroRow extends QueryResultRow {
  id: string;
  concurso_id: string;
  full_name: string;
  cpf: string;
  role: string;
  cert_kind: string;
  cert_subject_dn: string | null;
  cert_serial: string | null;
  active: boolean;
}

@Injectable()
export class BancaService {
  constructor(private readonly database: DatabaseService) {}

  async createMember(input: CreateBancaMembroDto) {
    this.ensureDatabase();
    const rows = await this.database.query<BancaMembroRow>(
      `
      INSERT INTO recrutamento.banca_membro (
        tenant_id, concurso_id, full_name, cpf, role, cert_kind, cert_subject_dn, cert_serial, active
      )
      SELECT c.tenant_id, c.id, $2, $3, $4::recrutamento.banca_membro_role, $5::recrutamento.banca_cert_kind, $6, $7, COALESCE($8, true)
      FROM recrutamento.concurso c
      WHERE c.id = $1::uuid
      RETURNING id::text, concurso_id::text, full_name, cpf, role::text, cert_kind::text, cert_subject_dn, cert_serial, active
      `,
      [
        input.concursoId,
        input.fullName,
        input.cpf,
        input.role,
        input.certKind,
        input.certSubjectDn ?? null,
        input.certSerial ?? null,
        input.active ?? true,
      ],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Concurso not found');
    AuditMutationContextStore.markMutationAudited();
    return this.toMember(row);
  }

  async listMembers(concursoId: string) {
    this.ensureDatabase();
    const rows = await this.database.query<BancaMembroRow>(
      `
      SELECT id::text, concurso_id::text, full_name, cpf, role::text, cert_kind::text, cert_subject_dn, cert_serial, active
      FROM recrutamento.banca_membro
      WHERE concurso_id = $1::uuid
      ORDER BY role, full_name
      `,
      [concursoId],
    );
    return rows.map((row) => this.toMember(row));
  }

  private toMember(row: BancaMembroRow) {
    return {
      id: row.id,
      concursoId: row.concurso_id,
      fullName: row.full_name,
      cpfMasked: `***${row.cpf.slice(3, 9)}**`,
      role: row.role,
      certKind: row.cert_kind,
      certSubjectDn: row.cert_subject_dn,
      certSerial: row.cert_serial,
      active: row.active,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}
