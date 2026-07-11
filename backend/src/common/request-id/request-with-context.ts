import { Request } from 'express';
import type { Principal, RequestPrincipalContext } from '@stynx-nyx/contracts';
import { AuthenticatedActor } from '../../auth/actor.types';
import type { RequestId, TenantId } from '../types/branded-ids';

export interface RequestWithContext extends Request {
  abortSignal?: AbortSignal | undefined;
  requestId?: RequestId | undefined;
  tenantId?: TenantId | undefined;
  actor?: AuthenticatedActor | undefined;
  principal?: Principal | undefined;
  principalContext?: RequestPrincipalContext | undefined;
  /**
   * W3C trace context trace-id for the current request. Populated by the
   * OpenTelemetry tracing middleware (see common/observability/otel.tracing.ts)
   * before the handler runs so that downstream concerns — Pino log lines,
   * audit writers, problem-details responses — can correlate with the OTel
   * span exported at request finish.
   */
  traceId?: string | undefined;
}
