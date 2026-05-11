import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_METADATA_KEY = 'sgp:idempotent';

export type IdempotencyOptions = {
  staleAfterSeconds?: number | undefined;
  ttlSeconds?: number | undefined;
};

export function Idempotent(options: IdempotencyOptions = {}): MethodDecorator {
  return SetMetadata(IDEMPOTENT_METADATA_KEY, options);
}
