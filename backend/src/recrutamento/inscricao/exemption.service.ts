import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { ExemptionRequestDto } from './inscricao.dto';

export interface ExemptionDecision {
  kind: 'NONE' | 'CADUNICO' | 'BONE_MARROW_DONOR';
  exempt: boolean;
  evidenceRef: string | null;
}

@Injectable()
export class ExemptionService {
  decide(input: ExemptionRequestDto): ExemptionDecision {
    if (input.kind === 'NONE') {
      return { kind: 'NONE', exempt: false, evidenceRef: null };
    }

    if (input.kind === 'CADUNICO') {
      if (!input.nis || !/^\d{11}$/.test(input.nis)) {
        throw new UnprocessableEntityException(
          'CadUnico exemption requires an 11-digit NIS',
        );
      }
      return {
        kind: 'CADUNICO',
        exempt: true,
        evidenceRef: input.evidenceRef ?? `cadunico:${input.nis}`,
      };
    }

    if (!input.donorRegistry?.trim()) {
      throw new UnprocessableEntityException(
        'Bone marrow donor exemption requires registry evidence',
      );
    }
    return {
      kind: 'BONE_MARROW_DONOR',
      exempt: true,
      evidenceRef: input.evidenceRef ?? `bone-marrow:${input.donorRegistry}`,
    };
  }
}
