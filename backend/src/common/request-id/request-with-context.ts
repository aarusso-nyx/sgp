import { Request } from 'express';
import type { Principal, RequestPrincipalContext } from '@stynx/contracts';
import { AuthenticatedActor } from '../../auth/actor.types';

export interface RequestWithContext extends Request {
  requestId?: string;
  tenantId?: string;
  actor?: AuthenticatedActor;
  principal?: Principal;
  principalContext?: RequestPrincipalContext;
}
