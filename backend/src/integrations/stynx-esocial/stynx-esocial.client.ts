import { BadRequestException, Injectable } from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import {
  EsocialEventsService,
  type EsocialEventsRecord,
  type EsocialEventsSourceRef,
} from '../../esocial-events';
import type { EsocialClass } from './contracts';

export type StynxEsocialEnqueueInput = Readonly<{
  tenantId?: string | undefined;
  kind: EsocialClass;
  eventClass: string;
  sourceRef?: EsocialEventsSourceRef | undefined;
  payload?: unknown;
  actorSub?: string | undefined;
  actorLogin?: string | undefined;
  requestId?: string | undefined;
  maxAttempts?: number | undefined;
}>;

export type StynxEsocialEnqueueResult = Readonly<{
  messageId: string;
  tenantId: string;
  kind: EsocialClass;
  eventClass: string;
  status: EsocialEventsRecord['status'];
  sourceRef: EsocialEventsSourceRef;
  createdAt: string;
}>;

@Injectable()
export class StynxEsocialClient {
  constructor(private readonly eventsService: EsocialEventsService) {}

  async enqueue(
    input: StynxEsocialEnqueueInput,
  ): Promise<StynxEsocialEnqueueResult> {
    const context = RequestContextStore.get();
    const tenantId = input.tenantId ?? this.currentTenantId();
    const actorSub = input.actorSub ?? context?.actor?.sub;
    const actorLogin = input.actorLogin ?? context?.actor?.username;
    const requestId = input.requestId ?? context?.requestId;
    const row = await this.eventsService.recordPending({
      tenantId,
      kind: input.kind,
      eventClass: input.eventClass,
      payload: input.payload ?? {},
      ...(input.sourceRef ? { sourceRef: input.sourceRef } : {}),
      ...(actorSub ? { actorSub } : {}),
      ...(actorLogin ? { actorLogin } : {}),
      ...(requestId ? { requestId } : {}),
      ...(input.maxAttempts !== undefined
        ? { maxAttempts: input.maxAttempts }
        : {}),
    });
    return this.toResult(row);
  }

  async listCurrentTenant(
    filters: Parameters<EsocialEventsService['findByTenant']>[1] = {},
  ): Promise<EsocialEventsRecord[]> {
    return this.eventsService.findByTenant(this.currentTenantId(), filters);
  }

  currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return tenantId;
  }

  private toResult(row: EsocialEventsRecord): StynxEsocialEnqueueResult {
    return {
      messageId: row.messageId,
      tenantId: row.tenantId,
      kind: row.kind,
      eventClass: row.eventClass,
      status: row.status,
      sourceRef: row.sourceRef,
      createdAt: row.createdAt,
    };
  }
}
