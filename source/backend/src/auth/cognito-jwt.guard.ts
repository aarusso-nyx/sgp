import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { RequestContextStore } from '../common/request-context/request-context.store';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { CognitoJwtService } from './cognito-jwt.service';

@Injectable()
export class CognitoJwtGuard implements CanActivate {
  constructor(private readonly cognitoJwtService: CognitoJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    request.actor = await this.cognitoJwtService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (request.actor) {
      request.tenantId = request.actor.tenantId;
      RequestContextStore.setActor(request.actor);
      RequestContextStore.setTenantId(request.actor.tenantId);
    }
    return true;
  }
}
