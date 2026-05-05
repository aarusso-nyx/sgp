import { BadRequestException, Injectable } from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { StynxEsocialClient } from '../../integrations/stynx-esocial';
import { CreateESocialEventDto } from './esocial.dto';

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
  constructor(private readonly stynxEsocialClient: StynxEsocialClient) {}

  async createEvent(
    input: CreateESocialEventDto,
  ): Promise<ESocialEventSummary> {
    const emitted = await this.stynxEsocialClient.enqueue({
      tenantId: this.currentTenantId(),
      kind: 'submit',
      eventClass: input.tipo,
      sourceRef: {
        reference: input.referencia.trim(),
        competence: input.competencia,
      },
      payload: {
        reference: input.referencia.trim(),
        competence: input.competencia,
        xml: this.eventXml(input),
        data: input.dados ?? {},
      },
    });

    return {
      id: emitted.messageId,
      tipo: emitted.eventClass,
      referencia: input.referencia.trim(),
      competencia: input.competencia,
      status: this.toApiStatus(emitted.status),
      createdAt: emitted.createdAt,
    };
  }

  private toApiStatus(status: string): string {
    return status === 'PENDENTE' || status === 'PENDING'
      ? 'PENDENTE_ENVIO'
      : status;
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
