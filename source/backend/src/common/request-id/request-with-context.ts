import { Request } from 'express';
import { AuthenticatedActor } from '../../auth/auth.types';

export interface RequestWithContext extends Request {
  requestId?: string;
  tenantId?: string;
  actor?: AuthenticatedActor;
}
