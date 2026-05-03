import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  CreatePrevidentiaryDeclarationDto,
  GeneratePrevidenciarioOutputDto,
} from '../previdenciario.dto';
import {
  createReportRequest,
  employeeRow,
  ensureDatabase,
  toDeclarationSummary,
} from '../previdenciario.shared';
import { PrevidentiaryDeclarationRow } from '../previdenciario.types';

@Injectable()
export class DeclaracaoService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listDeclarations() {
    ensureDatabase(this.databaseService);
    const rows = await this.databaseService.query<PrevidentiaryDeclarationRow>(
      `
      SELECT
        declaration.id,
        declaration.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        declaration.type,
        declaration.issued_at,
        declaration.storage_key,
        declaration.issued_by_ref
      FROM hr.previdentiary_declaration declaration
      JOIN hr.employee employee ON employee.id = declaration.employee_id
      ORDER BY declaration.issued_at DESC
      `,
    );
    return rows.map((row) => toDeclarationSummary(row));
  }

  async createDeclaration(input: CreatePrevidentiaryDeclarationDto) {
    ensureDatabase(this.databaseService);
    const employee = await employeeRow(
      this.databaseService,
      input.funcionarioId,
    );
    const rows = await this.databaseService.query<PrevidentiaryDeclarationRow>(
      `
      INSERT INTO hr.previdentiary_declaration (
        employee_id,
        type,
        issued_at,
        storage_key,
        issued_by_ref
      )
      VALUES (
        $1::uuid,
        $2,
        now(),
        NULLIF($3, ''),
        NULLIF($4, '')
      )
      RETURNING
        id,
        employee_id::text,
        $5::text AS registration,
        $6::text AS employee_name,
        type,
        issued_at,
        storage_key,
        issued_by_ref
      `,
      [
        input.funcionarioId,
        input.tipo.trim(),
        input.storageKey ?? '',
        input.emitidaPorId ?? '',
        employee.registration,
        employee.name,
      ],
    );
    return toDeclarationSummary(rows[0]!);
  }

  async requestDeclarationOutput(
    declarationId: string,
    input: GeneratePrevidenciarioOutputDto,
  ) {
    const exists = await this.databaseService.query<QueryResultRow>(
      `SELECT 1 FROM hr.previdentiary_declaration WHERE id = $1::uuid`,
      [declarationId],
    );
    if (!exists[0]) {
      throw new NotFoundException('Previdentiary declaration not found');
    }
    return createReportRequest(
      this.databaseService,
      'PREVIDENCIARIO_DECLARACAO',
      'Declaracao previdenciaria',
      {
        declarationId,
        format: input.formato ?? 'PDF',
      },
    );
  }
}
