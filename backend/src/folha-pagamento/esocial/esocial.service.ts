import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { ESocialEmitService } from '../../esocial-worker/esocial-emit.service';
import { CreateESocialEventDto } from './esocial.dto';

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
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emitService: ESocialEmitService,
  ) {}

  async createEvent(
    input: CreateESocialEventDto,
  ): Promise<ESocialEventSummary> {
    this.ensureDatabase();
    const definitionId = await this.ensureDefinition();
    const { year, month } = this.parseCompetence(input.competencia);
    const emitted = await this.emitService.emit({
      tenantId: this.currentTenantId(),
      eventKind: input.tipo,
      xml: this.eventXml(input),
      reference: input.referencia.trim(),
      competence: input.competencia,
      payload: input.dados ?? {},
    });

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
          eventId: emitted.id,
          eventType: emitted.eventKind,
          competence: emitted.competence,
          format: 'XML',
        }),
      ],
    );

    return {
      id: emitted.id,
      tipo: emitted.eventKind,
      referencia: emitted.reference,
      competencia: emitted.competence,
      status: this.toApiStatus(emitted.status),
      createdAt: emitted.createdAt,
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
    return rows[0]!.id;
  }

  private parseCompetence(competence: string): { year: number; month: number } {
    const [year, month] = competence
      .split('-')
      .map((value) => Number(value)) as [number, number];
    return {
      year,
      month,
    };
  }

  private toApiStatus(status: string): string {
    return status === 'PENDENTE' ? 'PENDENTE_ENVIO' : status;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for eSocial operations',
      );
    }
  }

  private eventXml(input: CreateESocialEventDto): string {
    const xml = input.dados?.['xml'];
    if (typeof xml === 'string' && xml.trim()) return xml;
    throw new BadRequestException(
      'eSocial emission requires dados.xml with a complete S-1.3 event XML payload',
    );
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return tenantId;
  }
}
