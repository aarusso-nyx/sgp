import { createHash } from 'node:crypto';
import { domainError } from '../../../common/errors/domain-error';

export type AtosPessoalState = 'SP' | 'MG' | 'RJ';

export interface AtosPessoalDraftPayload {
  sourceStatus: 'UNVERIFIED_LAYOUT';
  stateCode: AtosPessoalState;
  tenantId: string;
  actId: string;
  actKind: 'ADMISSION' | 'RETIREMENT' | 'PENSION' | 'DISMISSAL';
  employeeCpf: string;
  employeeRegistration: string;
  actDate: string;
}

export interface AtosPessoalDraftEnvelope {
  contentType: 'application/json';
  payloadHash: string;
  body: string;
}

export class AtosPessoalDraftSerializer {
  serialize(payload: AtosPessoalDraftPayload): AtosPessoalDraftEnvelope {
    assertPayload(payload);
    const body = JSON.stringify(
      {
        stateCode: payload.stateCode,
        layoutCode: `TCE-${payload.stateCode}-ATOS-PESSOAL-SOURCE-PENDING`,
        layoutVersion: '0.0.1',
        sourceStatus: 'UNVERIFIED_LAYOUT',
        officialConformance: false,
        payload,
      },
      null,
      2,
    );
    return {
      contentType: 'application/json',
      payloadHash: createHash('sha256').update(body).digest('hex'),
      body,
    };
  }
}

function assertPayload(payload: AtosPessoalDraftPayload): void {
  if (payload.sourceStatus !== 'UNVERIFIED_LAYOUT') {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      'Atos de Pessoal sourceStatus must be UNVERIFIED_LAYOUT',
    );
  }
  if (!['SP', 'MG', 'RJ'].includes(payload.stateCode)) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      `Unsupported Atos de Pessoal state: ${payload.stateCode}`,
    );
  }
}
