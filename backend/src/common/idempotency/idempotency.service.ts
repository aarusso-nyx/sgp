import { ConflictException, Injectable } from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { sha256Hex, stableJsonSha256 } from '../crypto/stable-hash';
import { DatabaseService } from '../../database/database.service';
import type { IdempotencyOptions } from './idempotency.decorator';

export type IdempotencyReserveResult =
  | { kind: 'started'; reclaimed: boolean }
  | { kind: 'replay'; snapshot: IdempotencyResponseSnapshot }
  | { kind: 'processing'; retryAfterSeconds: number };

export type IdempotencyResponseSnapshot = {
  body: unknown;
  statusCode: number;
};

type IdempotencyRow = QueryResultRow & {
  created_at: Date | string;
  request_hash: string;
  response_snapshot: IdempotencyResponseSnapshot | null;
  status: 'processing' | 'completed' | 'failed';
  ttl_expired: boolean;
  updated_at: Date | string;
};

const DEFAULT_STALE_AFTER_SECONDS = 30;
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const MAX_RESERVATION_LOAD_ATTEMPTS = 2;
const RETRY_AFTER_SECONDS = 1;

@Injectable()
export class IdempotencyService {
  constructor(private readonly database: DatabaseService) {}

  keyHash(rawKey: string): string {
    return sha256Hex(rawKey.trim());
  }

  requestHash(input: unknown): string {
    return stableJsonSha256(input);
  }

  async reserve(
    keyHash: string,
    requestHash: string,
    options: IdempotencyOptions = {},
  ): Promise<IdempotencyReserveResult> {
    const staleAfterSeconds =
      options.staleAfterSeconds ?? DEFAULT_STALE_AFTER_SECONDS;
    const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;

    for (let attempt = 0; attempt < MAX_RESERVATION_LOAD_ATTEMPTS; attempt++) {
      const reserved = await this.database.transaction<
        IdempotencyReserveResult | undefined
      >(async (client) => {
        const inserted = await client.query<IdempotencyRow>(
          `
            INSERT INTO public.idempotency_keys (key_hash, request_hash, status, ttl_at)
            VALUES ($1, $2, 'processing', now() + make_interval(secs => $3::int))
            ON CONFLICT (tenant_id, key_hash) DO NOTHING
            RETURNING
              request_hash,
              response_snapshot,
              status,
              created_at,
              updated_at,
              ttl_at <= now() AS ttl_expired
          `,
          [keyHash, requestHash, ttlSeconds],
        );

        if (inserted.rowCount === 1) {
          return { kind: 'started', reclaimed: false };
        }

        const row = await this.loadRowForUpdate(client, keyHash);
        if (!row) {
          return undefined;
        }

        if (row.request_hash !== requestHash) {
          throw new ConflictException(
            'Idempotency-Key was already used with a different request body',
          );
        }

        if (row.status === 'completed' && !row.ttl_expired) {
          return {
            kind: 'replay',
            snapshot: row.response_snapshot ?? { body: null, statusCode: 200 },
          };
        }

        if (row.status === 'processing' && !isStale(row, staleAfterSeconds)) {
          return { kind: 'processing', retryAfterSeconds: RETRY_AFTER_SECONDS };
        }

        await client.query(
          `
            UPDATE public.idempotency_keys
               SET status = 'processing',
                   response_snapshot = NULL,
                   updated_at = now(),
                   ttl_at = now() + make_interval(secs => $2::int)
             WHERE tenant_id = public.sgp_current_tenant_uuid()
               AND key_hash = $1
          `,
          [keyHash, ttlSeconds],
        );

        return { kind: 'started', reclaimed: true };
      });

      if (reserved) {
        return reserved;
      }
    }

    throw new ConflictException(
      'Idempotency-Key reservation could not be loaded; retry the request',
    );
  }

  async complete(
    keyHash: string,
    requestHash: string,
    snapshot: IdempotencyResponseSnapshot,
    options: IdempotencyOptions = {},
  ): Promise<void> {
    const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    await this.database.query(
      `
        UPDATE public.idempotency_keys
           SET status = 'completed',
               response_snapshot = $3::jsonb,
               updated_at = now(),
               ttl_at = now() + make_interval(secs => $4::int)
         WHERE tenant_id = public.sgp_current_tenant_uuid()
           AND key_hash = $1
           AND request_hash = $2
      `,
      [keyHash, requestHash, JSON.stringify(snapshot), ttlSeconds],
    );
  }

  async fail(keyHash: string, requestHash: string): Promise<void> {
    await this.database.query(
      `
        UPDATE public.idempotency_keys
           SET status = 'failed',
               updated_at = now()
         WHERE tenant_id = public.sgp_current_tenant_uuid()
           AND key_hash = $1
           AND request_hash = $2
      `,
      [keyHash, requestHash],
    );
  }

  private async loadRowForUpdate(
    client: PoolClient,
    keyHash: string,
  ): Promise<IdempotencyRow | undefined> {
    const result = await client.query<IdempotencyRow>(
      `
        SELECT
          request_hash,
          response_snapshot,
          status,
          created_at,
          updated_at,
          ttl_at <= now() AS ttl_expired
        FROM public.idempotency_keys
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND key_hash = $1
        FOR UPDATE
      `,
      [keyHash],
    );

    return result.rows[0];
  }
}

function isStale(row: IdempotencyRow, staleAfterSeconds: number): boolean {
  const updatedAt = new Date(row.updated_at).getTime();
  return Date.now() - updatedAt >= staleAfterSeconds * 1000;
}
