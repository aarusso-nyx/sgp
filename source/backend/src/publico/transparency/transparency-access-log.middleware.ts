import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { createHash } from 'node:crypto';

import { DatabaseService } from '../../database/database.service';
import type { RequestWithContext } from '../../common/request-id/request-with-context';

@Injectable()
export class TransparencyAccessLogMiddleware implements NestMiddleware {
  constructor(private readonly databaseService: DatabaseService) {}

  use(request: RequestWithContext, response: Response, next: NextFunction) {
    response.on('finish', () => {
      const tenantId = String(
        request.params?.tenantId ?? request.params?.tenant ?? '',
      );
      if (!tenantId || !this.databaseService.configured) return;
      void this.databaseService
        .query(
          `INSERT INTO public_data.transparency_access_log (
             tenant_id, ip_hash, user_agent_hash, path, query, status_code
           )
           VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6)`,
          [
            tenantId,
            this.hash(request.ip ?? request.socket.remoteAddress ?? ''),
            this.hash(String(request.header('user-agent') ?? '')),
            request.originalUrl.split('?')[0],
            JSON.stringify(request.query ?? {}),
            response.statusCode,
          ],
        )
        .catch(() => undefined);
    });
    next();
  }

  private hash(value: string): string {
    const salt =
      process.env.TRANSPARENCY_LOG_SALT ?? new Date().toISOString().slice(0, 7);
    return createHash('sha256').update(`${salt}:${value}`).digest('hex');
  }
}
