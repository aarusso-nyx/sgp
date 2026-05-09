import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { TceAdapter as TceAdapterMetadata } from '../contracts/tce-adapter.decorator';
import {
  HealthStatus,
  LayoutDescriptor,
  ParsedResponse,
  SerializedEnvelope,
  SubmissionReceipt,
  TceAdapter,
  ValidationResult,
} from '../contracts/tce-adapter.interface';
import { domainError } from '../../common/errors/domain-error';

@Injectable()
@TceAdapterMetadata({ id: 'noop', state_code: 'XX', organ_kind: 'TCE' })
export class NoopStubAdapter implements TceAdapter<Record<string, unknown>> {
  id(): string {
    return 'noop';
  }

  state_code(): string {
    return 'XX';
  }

  organ_kind(): 'TCE' {
    return 'TCE';
  }

  supported_layouts(): LayoutDescriptor[] {
    return [
      {
        code: 'NOOP',
        version: '0.0.1',
        description:
          'Deterministic no-op adapter for TCE contract lifecycle validation.',
      },
    ];
  }

  validate(
    payload: Record<string, unknown>,
    layout_version: string,
  ): ValidationResult {
    const layout = this.layoutFor(layout_version);
    if (!layout) {
      return {
        status: 'FAIL',
        errors: [`Unsupported layout version: ${layout_version}`],
        warnings: [],
      };
    }
    if (
      payload === null ||
      Array.isArray(payload) ||
      typeof payload !== 'object'
    ) {
      return {
        status: 'FAIL',
        errors: ['Payload must be a JSON object'],
        warnings: [],
      };
    }
    return { status: 'OK', errors: [], warnings: [] };
  }

  serialize(
    payload: Record<string, unknown>,
    layout_version: string,
  ): SerializedEnvelope {
    const layout = this.layoutFor(layout_version);
    if (!layout) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        `Unsupported layout version: ${layout_version}`,
      );
    }
    const body = JSON.stringify({
      adapterId: this.id(),
      layoutCode: layout.code,
      layoutVersion: layout.version,
      payload,
    });
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
      protocol: `NOOP-${envelope.payloadHash.slice(0, 12).toUpperCase()}`,
      status: 'ACCEPTED',
      submittedAt: '2026-05-02T00:00:00.000Z',
      rawResponse: {
        accepted: true,
        protocol: `NOOP-${envelope.payloadHash.slice(0, 12).toUpperCase()}`,
      },
    } satisfies SubmissionReceipt);
  }

  parseResponse(raw: unknown): ParsedResponse {
    const response =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      protocol:
        typeof response['protocol'] === 'string' ? response['protocol'] : null,
      status: response['accepted'] === false ? 'REJECTED' : 'ACCEPTED',
      message:
        response['accepted'] === false
          ? 'Rejected by noop adapter'
          : 'Accepted by noop adapter',
    };
  }

  health(): Promise<HealthStatus> {
    return Promise.resolve({
      status: 'OK',
      checkedAt: '2026-05-02T00:00:00.000Z',
      details: { mode: 'noop' },
    } satisfies HealthStatus);
  }

  private layoutFor(version: string): LayoutDescriptor | undefined {
    return this.supported_layouts().find(
      (layout) => layout.version === version,
    );
  }
}
