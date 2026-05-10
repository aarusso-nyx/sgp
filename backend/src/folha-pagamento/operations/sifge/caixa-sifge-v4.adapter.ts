import { createHash } from 'node:crypto';

import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import {
  CaixaSifgeAdapter,
  ParsedSifgePayload,
  SifgePayload,
} from './caixa-adapter.contract';
import { domainError } from '../../../common/errors/domain-error';

interface SifgeEnvelope {
  adapterKey: string;
  layoutVersion: string;
  signed: boolean;
  payload: SifgePayload;
  signature?: {
    algorithm: string;
    digest: string;
    profile: string;
  };
}

@Injectable()
export class CaixaSifgeV4Adapter implements CaixaSifgeAdapter {
  readonly adapterKey: string = 'caixa-sifge-v4';
  readonly layoutVersion: string = 'SIFGE-4.0';
  readonly requiresSignature: boolean = true;

  assemble(payload: SifgePayload): Buffer {
    const envelope: SifgeEnvelope = {
      adapterKey: this.adapterKey,
      layoutVersion: this.layoutVersion,
      signed: false,
      payload: this.normalize(payload),
    };
    return Buffer.from(JSON.stringify(envelope), 'utf8');
  }

  parse(buffer: Buffer): ParsedSifgePayload {
    const envelope = this.readEnvelope(buffer);
    return {
      ...envelope.payload,
      adapterKey: envelope.adapterKey,
      layoutVersion: envelope.layoutVersion,
      signed: envelope.signed,
    };
  }

  signIfRequired(buffer: Buffer): Buffer {
    const envelope = this.readEnvelope(buffer);
    if (!this.requiresSignature || envelope.signed) return buffer;

    const unsigned = JSON.stringify({
      adapterKey: envelope.adapterKey,
      layoutVersion: envelope.layoutVersion,
      payload: envelope.payload,
    });
    const signed: SifgeEnvelope = {
      ...envelope,
      signed: true,
      signature: {
        algorithm: 'sha256',
        digest: createHash('sha256').update(unsigned).digest('hex'),
        profile: 'ICP-Brasil/ES-07',
      },
    };
    return Buffer.from(JSON.stringify(signed), 'utf8');
  }

  private normalize(payload: SifgePayload): SifgePayload {
    return {
      header: payload.header,
      totals: payload.totals,
      records: [...payload.records].sort((left, right) =>
        [
          left.employmentLinkId,
          left.employeeId,
          left.payrollRunId ?? '',
          left.movementId ?? '',
        ]
          .join('|')
          .localeCompare(
            [
              right.employmentLinkId,
              right.employeeId,
              right.payrollRunId ?? '',
              right.movementId ?? '',
            ].join('|'),
          ),
      ),
    };
  }

  private readEnvelope(buffer: Buffer): SifgeEnvelope {
    try {
      const parsed = JSON.parse(buffer.toString('utf8')) as SifgeEnvelope;
      if (
        parsed.adapterKey !== this.adapterKey ||
        parsed.layoutVersion !== this.layoutVersion ||
        !parsed.payload?.header ||
        !Array.isArray(parsed.payload.records)
      ) {
        throw domainError.internal(
          'INTERNAL_INVARIANT',
          'Invalid SIFGE envelope',
        );
      }
      return parsed;
    } catch {
      throw new UnprocessableEntityException('Invalid SIFGE 4.0 payload');
    }
  }
}
