import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { RequestContextStore } from '../request-context/request-context.store';
import { requestId as brandRequestId } from '../types/branded-ids';
import type { RequestWithContext } from './request-with-context';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction) {
    const incoming = request.header('x-request-id');
    const requestId =
      incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();

    const brandedRequestId = brandRequestId(requestId);
    RequestContextStore.run({ requestId: brandedRequestId }, () => {
      request.requestId = brandedRequestId;
      response.setHeader('x-request-id', requestId);
      next();
    });
  }
}
