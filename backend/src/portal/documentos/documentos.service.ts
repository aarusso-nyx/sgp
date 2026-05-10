import { BadRequestException, Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { AuthenticatedActor } from '../../auth/actor.types';
import { DatabaseService } from '../../database/database.service';
import { MeusDadosService } from '../meus-dados/meus-dados.service';

interface DocumentRow extends QueryResultRow {
  id: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  checksum: string | null;
  created_at: Date | string;
}

interface DocumentRequestRow extends QueryResultRow {
  id: string;
  employee_id: string;
  document_kind: string;
  purpose: string;
  status: string;
  due_at: Date | string | null;
  fulfilled_attachment_id: string | null;
  notes: string;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class DocumentosService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly meusDadosService: MeusDadosService,
  ) {}

  async getDocuments(actor: AuthenticatedActor | undefined) {
    const employee = await this.meusDadosService.loadEmployee(actor);
    const rows = await this.databaseService.query<DocumentRow>(
      `
      SELECT id::text, file_name, content_type, size_bytes, checksum, created_at
      FROM public.document_attachment
      WHERE owner_type = 'employee'
        AND owner_id = $1::text
        AND tenant_id = public.sgp_current_tenant_uuid()
      ORDER BY created_at DESC
      `,
      [employee.id],
    );
    return rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
      checksum: row.checksum,
      createdAt: this.meusDadosService.toIso(row.created_at),
    }));
  }

  async listDocumentRequests(actor: AuthenticatedActor | undefined) {
    const employee = await this.meusDadosService.loadEmployee(actor);
    const rows = await this.databaseService.query<DocumentRequestRow>(
      `
      SELECT
        id::text,
        employee_id::text,
        document_kind,
        purpose,
        status::text,
        due_at,
        fulfilled_attachment_id::text,
        notes,
        created_at,
        updated_at
      FROM public.document_request
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [employee.id],
    );
    return rows.map((row) => this.toDocumentRequest(row));
  }

  async createDocumentRequest(
    actor: AuthenticatedActor | undefined,
    input: { documentKind: string; purpose?: string; notes?: string },
  ) {
    const employee = await this.meusDadosService.loadEmployee(actor);
    const documentKind = input.documentKind.trim();
    if (!documentKind) {
      throw new BadRequestException('documentKind is required');
    }
    const rows = await this.databaseService.query<DocumentRequestRow>(
      `
      INSERT INTO public.document_request (
        employee_id,
        document_kind,
        purpose,
        notes,
        requested_by_sub,
        requested_by_login
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        NULLIF($5, ''),
        NULLIF($6, '')
      )
      RETURNING
        id::text,
        employee_id::text,
        document_kind,
        purpose,
        status::text,
        due_at,
        fulfilled_attachment_id::text,
        notes,
        created_at,
        updated_at
      `,
      [
        employee.id,
        documentKind,
        input.purpose?.trim() ?? '',
        input.notes?.trim() ?? '',
        actor?.sub ?? '',
        actor?.username ?? '',
      ],
    );
    return this.toDocumentRequest(rows[0]!);
  }

  private toDocumentRequest(row: DocumentRequestRow) {
    return {
      id: row.id,
      employeeId: row.employee_id,
      documentKind: row.document_kind,
      purpose: row.purpose,
      status: row.status,
      dueAt: row.due_at ? this.meusDadosService.toDate(row.due_at) : null,
      fulfilledAttachmentId: row.fulfilled_attachment_id,
      notes: row.notes,
      createdAt: this.meusDadosService.toIso(row.created_at),
      updatedAt: this.meusDadosService.toIso(row.updated_at),
    };
  }
}
