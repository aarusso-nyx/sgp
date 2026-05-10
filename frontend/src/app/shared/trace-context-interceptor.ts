import { HttpInterceptorFn } from '@angular/common/http';

export const traceContextInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('traceparent')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        traceparent: createTraceparent(),
      },
    }),
  );
};

export function createTraceparent(): string {
  return `00-${randomHex(16)}-${randomHex(8)}-01`;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
