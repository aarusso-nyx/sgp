import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { RequestWithContext } from '../common/request-id/request-with-context';
import { AuthenticatedActor } from './actor.types';

export const CurrentActor = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthenticatedActor | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    return request.actor;
  },
);
