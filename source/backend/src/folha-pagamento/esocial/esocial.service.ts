import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { CreateESocialEventDto } from './esocial.dto';

interface ESocialEventRow extends QueryResultRow {
  id: string;
  event_type: string;
  reference: string;
  competence: string;
  status: string;
  created_at: Date | string;
}

interface DefinitionRow extends QueryResultRow {
  id: string;
}

export interface ESocialEventSummary {
  id: string;
  tipo: string;
  referencia: string;
  competencia: string;
  status: string;
  createdAt: string;
}

@Injectable()
export class ESocialService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createEvent(
    input: CreateESocialEventDto,
  ): Promise<ESocialEventSummary> {
    this.ensureDatabase();
    const definitionId = await this.ensureDefinition();
    const { year, month } = this.parseCompetence(input.competencia);

    const eventRows = await this.databaseService.query<ESocialEventRow>(
      `
      INSERT INTO public.esocial_event (
        event_type,
        reference,
        competence,
        payload
      )
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING
        id::text,
        event_type,
        reference,
        competence,
        status::text,
        created_at
      `,
      [
        input.tipo.trim(),
        input.referencia.trim(),
        input.competencia,
        JSON.stringify(input.dados ?? {}),
      ],
    );

    const event = eventRows[0];

    await this.databaseService.query(
      `
      INSERT INTO public.report_request (
        definition_id,
        competence_year,
        competence_month,
        parameters
      )
      VALUES ($1::uuid, $2, $3, $4::jsonb)
      `,
      [
        definitionId,
        year,
        month,
        JSON.stringify({
          eventId: event.id,
          eventType: event.event_type,
          competence: event.competence,
          format: 'XML',
        }),
      ],
    );

    return {
      id: event.id,
      tipo: event.event_type,
      referencia: event.reference,
      competencia: event.competence,
      status: this.toApiStatus(event.status),
      createdAt: this.toIso(event.created_at),
    };
  }

  private async ensureDefinition(): Promise<string> {
    const rows = await this.databaseService.query<DefinitionRow>(
      `
      INSERT INTO public.report_definition (
        code,
        module_key,
        name,
        description
      )
      VALUES (
        'ESOCIAL_EVENTO_PROCESSAR',
        'FOLHA',
        'Processar evento eSocial',
        'Gera XML, simula assinatura e encaminha evento eSocial para processamento assíncrono.'
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET module_key = EXCLUDED.module_key,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = now()
      RETURNING id::text
      `,
    );
    return rows[0].id;
  }

  private parseCompetence(competence: string): { year: number; month: number } {
    const [year, month] = competence.split('-').map((value) => Number(value));
    return {
      year,
      month,
    };
  }

  private toApiStatus(status: string): string {
    return status === 'PENDENTE' ? 'PENDENTE_ENVIO' : status;
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for eSocial operations',
      );
    }
  }
}
