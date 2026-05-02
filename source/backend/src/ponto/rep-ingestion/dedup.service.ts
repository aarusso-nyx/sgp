import { BadRequestException, Injectable } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { ParsedRepLine } from './rep-ingestion.types';

interface ExistingNsrRow extends QueryResultRow {
  nsr: string;
}

export interface DedupResult {
  duplicateNsrs: Set<number>;
  duplicate: boolean;
}

@Injectable()
export class DedupService {
  async validate(
    client: PoolClient,
    repDeviceId: string,
    lines: ParsedRepLine[],
  ): Promise<DedupResult> {
    if (lines.length === 0) {
      throw new BadRequestException('Ingestion batch contains no lines');
    }

    let previous = 0;
    for (const line of lines) {
      if (line.nsr <= previous) {
        throw new BadRequestException(
          `NSR regression at line ${line.lineNo}: ${line.nsr} after ${previous}`,
        );
      }
      previous = line.nsr;
    }

    const existingRows = await client.query<ExistingNsrRow>(
      `
      SELECT nsr::text
      FROM ponto.rep_ingestion_line
      WHERE rep_device_id = $1::uuid
      ORDER BY nsr
      `,
      [repDeviceId],
    );
    const existingNsrs = new Set(
      existingRows.rows.map((row) => Number(row.nsr)),
    );
    const duplicateNsrs = new Set(
      lines
        .filter((line) => existingNsrs.has(line.nsr))
        .map((line) => line.nsr),
    );

    const maxExisting = existingRows.rows.reduce(
      (max, row) => Math.max(max, Number(row.nsr)),
      0,
    );
    const retrogradeNewLine = lines.find(
      (line) => !duplicateNsrs.has(line.nsr) && line.nsr <= maxExisting,
    );
    if (retrogradeNewLine) {
      throw new BadRequestException(
        `NSR regression against device history at line ${retrogradeNewLine.lineNo}: ${retrogradeNewLine.nsr} after ${maxExisting}`,
      );
    }

    return {
      duplicateNsrs,
      duplicate: duplicateNsrs.size === lines.length,
    };
  }
}
