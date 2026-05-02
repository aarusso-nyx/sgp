import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SerializedEnvelope } from '../../../contracts/tce-adapter.interface';

export interface AudespStubResponse {
  accepted: boolean;
  protocol: string;
  message: string;
  receivedHash: string;
  receivedAt: string;
}

@Injectable()
export class AudespStubServerService {
  constructor(private readonly configService: ConfigService) {}

  submit(envelope: SerializedEnvelope): AudespStubResponse {
    const fixturePath = this.configService.get<string>(
      'TCE_AUDESP_SP_FIXTURE_RESPONSE',
    );
    if (fixturePath) {
      return JSON.parse(
        readFileSync(fixturePath, 'utf8'),
      ) as AudespStubResponse;
    }
    const reject = /<TipoRemessa>STUB_REJECT<\/TipoRemessa>/.test(
      envelope.body,
    );
    const protocolSeed = createHash('sha256')
      .update(`${envelope.payloadHash}:${reject ? 'reject' : 'success'}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();
    return {
      accepted: !reject,
      protocol: `AUDESP-STUB-${protocolSeed}`,
      message: reject
        ? 'Rejected by AUDESP/SP stub'
        : 'Accepted by AUDESP/SP stub',
      receivedHash: envelope.payloadHash,
      receivedAt: '2026-05-02T00:00:00.000Z',
    };
  }
}
