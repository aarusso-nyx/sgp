import { EventEmitter } from 'node:events';

import { bindRequestAbortSignal } from './request-abort-signal';
import type { RequestWithContext } from '../request-id/request-with-context';

describe('request AbortSignal plumbing', () => {
  it('aborts the request signal and logs a cancellation marker on client disconnect', () => {
    const request = new EventEmitter() as RequestWithContext;
    request.destroyed = true;
    request.originalUrl = '/api/v1/slow';
    request.requestId = 'request-1' as RequestWithContext['requestId'];
    const logger = { warn: jest.fn() };

    const binding = bindRequestAbortSignal(request, logger);
    request.emit('close');

    expect(binding.abortSignal.aborted).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'request_aborted',
        path: '/api/v1/slow',
      }),
    );
  });
});
