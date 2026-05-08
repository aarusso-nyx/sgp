import { Request } from 'express';
import type { Principal, RequestPrincipalContext } from '@stynx/contracts';
import { AuthenticatedActor } from '../../auth/actor.types';

export interface RequestWithContext extends Request {
  requestId?: string | undefined;
  tenantId?: string | undefined;
  actor?: AuthenticatedActor | undefined;
  principal?: Principal | undefined;
  principalContext?: RequestPrincipalContext | undefined;
}
