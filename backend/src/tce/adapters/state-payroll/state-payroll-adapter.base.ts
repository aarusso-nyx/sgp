import { createHash } from 'node:crypto';

import {
  HealthStatus,
  LayoutDescriptor,
  ParsedResponse,
  SerializedEnvelope,
  SubmissionReceipt,
  TceAdapter,
  TceOrganKind,
  ValidationResult,
} from '../../contracts/tce-adapter.interface';

export interface StatePayrollAdapterConfig {
  id: string;
  stateCode: string;
  organKind: TceOrganKind;
  organName: string;
}

export interface StatePayrollDraftPayload {
  sourceStatus: 'UNVERIFIED_LAYOUT';
  tenantId: string;
  competence: string;
  payrollRunId: string;
  rows: StatePayrollDraftRow[];
}

export interface StatePayrollDraftRow {
  registration: string;
  cpf: string;
  grossAmount: string;
  deductionAmount: string;
  netAmount: string;
}

export abstract class StatePayrollSourcePendingAdapter implements TceAdapter<StatePayrollDraftPayload> {
  protected constructor(private readonly config: StatePayrollAdapterConfig) {}

  id(): string {
    return this.config.id;
  }

  state_code(): string {
    return this.config.stateCode;
  }

  organ_kind(): TceOrganKind {
    return this.config.organKind;
  }

  supported_layouts(): LayoutDescriptor[] {
    return [
      {
        code: `${this.config.id.toUpperCase()}-FOLHA-SOURCE-PENDING`,
        version: '0.0.1',
        description: `${this.config.organName} payroll adapter contract; official layout source pending owner validation.`,
      },
    ];
  }

  validate(
    payload: StatePayrollDraftPayload,
    layoutVersion: string,
  ): ValidationResult {
    const errors: string[] = [];
    if (!this.layoutFor(layoutVersion)) {
      errors.push(`Unsupported layout version: ${layoutVersion}`);
    }
    if (payload?.sourceStatus !== 'UNVERIFIED_LAYOUT') {
      errors.push(
        'Payload must explicitly carry sourceStatus=UNVERIFIED_LAYOUT until an official layout is selected.',
      );
    }
    if (!payload?.tenantId) errors.push('tenantId is required');
    if (!payload?.competence) errors.push('competence is required');
    if (!payload?.payrollRunId) errors.push('payrollRunId is required');
    if (!Array.isArray(payload?.rows) || payload.rows.length === 0) {
      errors.push('rows must include at least one payroll row');
    }
    return {
      status: errors.length ? 'FAIL' : 'OK',
      errors,
      warnings: [
        'Official regulatory conformance is blocked until the owner approves a published layout version.',
      ],
    };
  }

  serialize(
    payload: StatePayrollDraftPayload,
    layoutVersion: string,
  ): SerializedEnvelope {
    const layout = this.layoutFor(layoutVersion);
    if (!layout) {
      throw new Error(`Unsupported layout version: ${layoutVersion}`);
    }
    const body = JSON.stringify(
      {
        adapterId: this.id(),
        stateCode: this.state_code(),
        organKind: this.organ_kind(),
        layoutCode: layout.code,
        layoutVersion: layout.version,
        sourceStatus: 'UNVERIFIED_LAYOUT',
        officialConformance: false,
        payload,
      },
      null,
      2,
    );
    return {
      layoutCode: layout.code,
      layoutVersion: layout.version,
      contentType: 'application/json',
      payloadHash: createHash('sha256').update(body).digest('hex'),
      body,
    };
  }

  submit(envelope: SerializedEnvelope): Promise<SubmissionReceipt> {
    return Promise.resolve({
      protocol: `SOURCE-PENDING-${this.state_code()}-${envelope.payloadHash
        .slice(0, 12)
        .toUpperCase()}`,
      status: 'PENDING',
      submittedAt: '2026-05-03T00:00:00.000Z',
      rawResponse: {
        accepted: false,
        sourceStatus: 'UNVERIFIED_LAYOUT',
        message:
          'Submission is intentionally held in source-pending sandbox mode.',
      },
    });
  }

  parseResponse(raw: unknown): ParsedResponse {
    const response =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      protocol: null,
      status: 'PENDING',
      message:
        typeof response['message'] === 'string'
          ? response['message']
          : 'Source-pending adapter did not submit to an official endpoint.',
    };
  }

  health(): Promise<HealthStatus> {
    return Promise.resolve({
      status: 'OK',
      checkedAt: '2026-05-03T00:00:00.000Z',
      details: {
        mode: 'source-pending-sandbox',
        officialConformance: false,
      },
    });
  }

  private layoutFor(version: string): LayoutDescriptor | undefined {
    return this.supported_layouts().find(
      (layout) => layout.version === version,
    );
  }
}
