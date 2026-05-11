import type { QueueAdapterRequestEnvelope } from '../../../common/adapters';
import {
  OfficialLayoutRelayMockResponderBase,
  type OfficialLayoutRelayDecision,
  type OfficialLayoutRelayMockResponderOptions,
  type OfficialLayoutRelayScenario,
} from '../official-layout-relay.mock';

export const SIOPS_RELAY_QUEUE_KIND = 'siops' as const;

export type SiopsRelayKind = typeof SIOPS_RELAY_QUEUE_KIND;
export type SiopsRelayScenario = OfficialLayoutRelayScenario;

export type SiopsRelayRequestPayload = Readonly<{
  exportId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  period: string;
  contentHash: string;
  contentBase64: string;
  scenario?: SiopsRelayScenario | undefined;
}>;

export type SiopsRelayResponsePayload = Readonly<{
  relay: 'siops-relay';
  handledBy: 'siops-relay-mock';
  exportId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  period: string;
  ack: {
    protocol: string;
    status: 'SANDBOX_ACK';
    receivedAt: string;
    message: string;
  };
  boundary: {
    transmission: 'OUT_OF_SCOPE';
    acceptance: 'NOT_ASSERTED';
  };
  hashes: {
    requestSha256: string;
    contentSha256: string;
    evidenceHash: string;
  };
}>;

type RelayDecision = OfficialLayoutRelayDecision<SiopsRelayResponsePayload>;
export type SiopsRelayMockResponderOptions =
  OfficialLayoutRelayMockResponderOptions;

export class SiopsRelayMockResponder extends OfficialLayoutRelayMockResponderBase<
  SiopsRelayKind,
  SiopsRelayRequestPayload,
  SiopsRelayResponsePayload
> {
  constructor(options: SiopsRelayMockResponderOptions) {
    super(SIOPS_RELAY_QUEUE_KIND, options);
  }

  protected evaluate(
    request: QueueAdapterRequestEnvelope<
      SiopsRelayKind,
      SiopsRelayRequestPayload
    >,
  ): RelayDecision {
    const payload = request.payload;
    if (payload.scenario === 'TRANSIENT_ERROR') {
      return this.error(
        'RETRY',
        'TRANSIENT',
        'SIOPS_RELAY_TRANSIENT',
        'Mock SIOPS relay requested adapter retry.',
      );
    }
    if (payload.scenario === 'DEFINITIVE_ERROR') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_DEFINITIVE',
        'Mock SIOPS relay requested adapter retry.',
      );
    }
    if (!payload.exportId) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_MISSING_EXPORT',
        'SIOPS relay requests must carry an export id.',
      );
    }
    if (!payload.layoutEdition || !payload.sourceUrl) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_LAYOUT_METADATA_REQUIRED',
        'SIOPS relay requests must carry caller-selected layout metadata.',
      );
    }
    if (payload.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_SOURCE_STATUS_UNSUPPORTED',
        'SIOPS relay only accepts caller-selected official-layout artifacts.',
      );
    }

    const content = Buffer.from(payload.contentBase64, 'base64');
    const contentSha256 = this.sha256(content);
    if (content.byteLength === 0 || contentSha256 !== payload.contentHash) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPS_RELAY_CONTENT_HASH_MISMATCH',
        'SIOPS relay content hash does not match the submitted artifact.',
      );
    }

    const receivedAt = this.now().toISOString();
    const requestSha256 = this.sha256String(JSON.stringify(payload));
    const protocol = [
      'SIOPS',
      payload.period,
      contentSha256.slice(0, 16).toUpperCase(),
    ].join('-');

    return {
      status: 'OK',
      payload: {
        relay: 'siops-relay',
        handledBy: 'siops-relay-mock',
        exportId: payload.exportId,
        sourceStatus: payload.sourceStatus,
        layoutEdition: payload.layoutEdition,
        sourceUrl: payload.sourceUrl,
        tenantIbgeCode: payload.tenantIbgeCode,
        period: payload.period,
        ack: {
          protocol,
          status: 'SANDBOX_ACK',
          receivedAt,
          message:
            'Mock SIOPS relay accepted the local health fiscal CSV artifact for queue evidence.',
        },
        boundary: {
          transmission: 'OUT_OF_SCOPE',
          acceptance: 'NOT_ASSERTED',
        },
        hashes: {
          requestSha256,
          contentSha256,
          evidenceHash: this.sha256String(
            `${payload.exportId}:${request.tenant_id}:${contentSha256}`,
          ),
        },
      },
    };
  }
}
