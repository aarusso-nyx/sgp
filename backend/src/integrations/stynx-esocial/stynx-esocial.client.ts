import { BadRequestException, Injectable } from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import {
  EsocialSpoolService,
  type EsocialSpoolRecord,
  type EsocialSpoolSourceRef,
} from '../../esocial-spool';
import type { EsocialClass } from './contracts';

export type StynxEsocialEnqueueInput = Readonly<{
  tenantId?: string;
  kind: EsocialClass;
  eventClass: string;
  sourceRef?: EsocialSpoolSourceRef;
  payload?: unknown;
  actorSub?: string;
  actorLogin?: string;
  requestId?: string;
  maxAttempts?: number;
}>;

export type StynxEsocialEnqueueResult = Readonly<{
  messageId: string;
  tenantId: string;
  kind: EsocialClass;
  eventClass: string;
  status: EsocialSpoolRecord['status'];
  sourceRef: EsocialSpoolSourceRef;
  createdAt: string;
}>;

@Injectable()
export class StynxEsocialClient {
  constructor(private readonly spoolService: EsocialSpoolService) {}

  async enqueue(
    input: StynxEsocialEnqueueInput,
  ): Promise<StynxEsocialEnqueueResult> {
    const context = RequestContextStore.get();
    const tenantId = input.tenantId ?? this.currentTenantId();
    const row = await this.spoolService.recordPending({
      tenantId,
      kind: input.kind,
      eventClass: input.eventClass,
      sourceRef: input.sourceRef,
      payload: input.payload ?? {},
      actorSub: input.actorSub ?? context?.actor?.sub,
      actorLogin: input.actorLogin ?? context?.actor?.username,
      requestId: input.requestId ?? context?.requestId,
      maxAttempts: input.maxAttempts,
    });
    return this.toResult(row);
  }

  async listCurrentTenant(
    filters: Parameters<EsocialSpoolService['findByTenant']>[1] = {},
  ): Promise<EsocialSpoolRecord[]> {
    return this.spoolService.findByTenant(this.currentTenantId(), filters);
  }

  currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return tenantId;
  }

  private toResult(row: EsocialSpoolRecord): StynxEsocialEnqueueResult {
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
