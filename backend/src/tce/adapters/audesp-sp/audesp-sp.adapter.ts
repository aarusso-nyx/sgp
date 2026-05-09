import { createHash } from 'node:crypto';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TceAdapter as TceAdapterMetadata } from '../../contracts/tce-adapter.decorator';
import {
  HealthStatus,
  LayoutDescriptor,
  ParsedResponse,
  SerializedEnvelope,
  SubmissionReceipt,
  TceAdapter,
  ValidationResult,
} from '../../contracts/tce-adapter.interface';
import {
  AudespPayrollEnvelope,
  AudespValidationError,
} from './audesp-sp.types';
import { AudespStubServerService } from './stub/audesp-stub-server.service';
import { AudespXmlSerializer } from './serializer/audesp-xml.serializer';
import { domainError } from '../../../common/errors/domain-error';

@Injectable()
@TceAdapterMetadata({ id: 'audesp-sp', state_code: 'SP', organ_kind: 'TCE' })
export class AudespSpAdapter implements TceAdapter<AudespPayrollEnvelope> {
  constructor(
    private readonly configService: ConfigService,
    private readonly serializer: AudespXmlSerializer,
    private readonly stubServer: AudespStubServerService,
  ) {}

  id(): string {
    return 'audesp-sp';
  }

  state_code(): string {
    return 'SP';
  }

  organ_kind(): 'TCE' {
    return 'TCE';
  }

  supported_layouts(): LayoutDescriptor[] {
    return [
      {
        code: 'AUDESP-FOLHA',
        version: '0.0.1',
        description: 'AUDESP/SP Folha de Pagamento public placeholder stub.',
      },
    ];
  }

  validate(
    payload: AudespPayrollEnvelope,
    layoutVersion: string,
  ): ValidationResult {
    const errors: string[] = [];
    if (layoutVersion !== '0.0.1')
      errors.push(`Unsupported layout version: ${layoutVersion}`);
    if (payload.adapterId !== 'audesp-sp')
      errors.push('Payload adapterId must be audesp-sp');
    if (!payload.servers.length)
      errors.push('Payload must include at least one server');
    return { status: errors.length ? 'FAIL' : 'OK', errors, warnings: [] };
  }

  validationResult(errors: AudespValidationError[]): ValidationResult {
    return {
      status: errors.length ? 'FAIL' : 'OK',
      errors: errors.map((error) => `${error.fieldPath}: ${error.message}`),
      warnings: [],
    };
  }

  serialize(
    payload: AudespPayrollEnvelope,
    layoutVersion: string,
  ): SerializedEnvelope {
    if (layoutVersion !== '0.0.1') {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        `Unsupported layout version: ${layoutVersion}`,
      );
    }
    const body = this.serializer.serialize(payload);
    return {
      layoutCode: 'AUDESP-FOLHA',
      layoutVersion,
      contentType: 'application/xml',
      payloadHash: createHash('sha256').update(body).digest('hex'),
      body,
    };
  }

  submit(envelope: SerializedEnvelope): Promise<SubmissionReceipt> {
    if (!this.stubMode()) {
      return Promise.reject(
        new ServiceUnavailableException(
          'AUDESP/SP production submission is disabled. Configure an installation-specific production adapter before setting TCE_STUB_MODE=false.',
        ),
      );
    }
    const response = this.stubServer.submit(envelope);
    return Promise.resolve({
      protocol: response.protocol,
      status: response.accepted ? 'ACCEPTED' : 'REJECTED',
      submittedAt: response.receivedAt,
      rawResponse: response,
    });
  }

  parseResponse(raw: unknown): ParsedResponse {
    const response =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      protocol:
        typeof response['protocol'] === 'string' ? response['protocol'] : null,
      status: response['accepted'] === false ? 'REJECTED' : 'ACCEPTED',
      message:
        typeof response['message'] === 'string'
          ? response['message']
          : 'AUDESP/SP stub response',
    };
  }

  health(): Promise<HealthStatus> {
    return Promise.resolve({
      status: 'OK',
      checkedAt: '2026-05-02T00:00:00.000Z',
      details: { mode: this.stubMode() ? 'stub' : 'production-disabled' },
    });
  }

  private stubMode(): boolean {
    return this.configService.get<string>('TCE_STUB_MODE') !== 'false';
  }
}
