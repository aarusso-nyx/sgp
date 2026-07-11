import { Logger, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import type { RequestWithContext } from '../request-id/request-with-context';
import { RequestContextStore } from '../request-context/request-context.store';

const requestAbortLogger = new Logger('RequestAbortSignal');

export type RequestAbortBinding = {
  abortSignal: AbortSignal;
  dispose: () => void;
};

export function bindRequestAbortSignal(
  request: RequestWithContext,
  logger: Pick<Logger, 'warn'> = requestAbortLogger,
): RequestAbortBinding {
  if (request.abortSignal) {
    return { abortSignal: request.abortSignal, dispose: () => undefined };
  }

  const controller = new AbortController();
  const abortSignal = controller.signal;
  const onClose = () => {
    if (request.destroyed || !request.readableEnded) {
      logger.warn({
        event: 'request_aborted',
        requestId: request.requestId,
        traceId: request.traceId,
        path: request.originalUrl ?? request.url,
      });
      controller.abort('client-disconnect');
    }
  };

  request.on('close', onClose);
  request.abortSignal = abortSignal;

  return {
    abortSignal,
    dispose: () => request.off('close', onClose),
  };
}

export const RequestAbortSignal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AbortSignal | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    return request.abortSignal ?? bindRequestAbortSignal(request).abortSignal;
  },
);

export function abortSignalFromRequest(
  request: Request | RequestWithContext,
): AbortSignal | undefined {
  return (request as RequestWithContext).abortSignal;
}

export function currentRequestAbortSignal(): AbortSignal | undefined {
  return RequestContextStore.get()?.abortSignal;
}

export function currentRequestAbortOptions():
  { abortSignal: AbortSignal } | undefined {
  const abortSignal = currentRequestAbortSignal();
  return abortSignal ? { abortSignal } : undefined;
}

export function combineAbortSignals(
  primary: AbortSignal,
  secondary: AbortSignal | undefined,
): AbortSignal {
  if (!secondary) return primary;
  if (primary.aborted) return primary;
  if (secondary.aborted) return secondary;

  const controller = new AbortController();
  const abort = (event: Event) => {
    const source = event.target as AbortSignal;
    controller.abort(source.reason);
  };
  primary.addEventListener('abort', abort, { once: true });
  secondary.addEventListener('abort', abort, { once: true });
  return controller.signal;
}
