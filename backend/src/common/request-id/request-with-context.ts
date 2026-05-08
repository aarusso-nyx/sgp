import { Request } from 'express';
import type { Principal, RequestPrincipalContext } from '@stynx/contracts';
import { AuthenticatedActor } from '../../auth/actor.types';
import type { RequestId, TenantId } from '../types/branded-ids';

export interface RequestWithContext extends Request {
  requestId?: RequestId | undefined;
  tenantId?: TenantId | undefined;
  actor?: AuthenticatedActor | undefined;
  principal?: Principal | undefined;
  principalContext?: RequestPrincipalContext | undefined;
}
