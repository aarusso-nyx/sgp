import type { QueueAdapterRequestEnvelope } from '../../../common/adapters';
import {
  OfficialLayoutRelayMockResponderBase,
  type OfficialLayoutRelayDecision,
  type OfficialLayoutRelayMockResponderOptions,
  type OfficialLayoutRelayScenario,
} from '../official-layout-relay.mock';

export const SIOPE_RELAY_QUEUE_KIND = 'siope' as const;

export type SiopeRelayKind = typeof SIOPE_RELAY_QUEUE_KIND;
export type SiopeRelayScenario = OfficialLayoutRelayScenario;

export type SiopeRelayRequestPayload = Readonly<{
  exportId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  year: number;
  contentHash: string;
  contentBase64: string;
  scenario?: SiopeRelayScenario | undefined;
}>;

export type SiopeRelayResponsePayload = Readonly<{
  relay: 'siope-relay';
  handledBy: 'siope-relay-mock';
  exportId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  year: number;
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

type RelayDecision = OfficialLayoutRelayDecision<SiopeRelayResponsePayload>;
export type SiopeRelayMockResponderOptions =
  OfficialLayoutRelayMockResponderOptions;

export class SiopeRelayMockResponder extends OfficialLayoutRelayMockResponderBase<
  SiopeRelayKind,
  SiopeRelayRequestPayload,
  SiopeRelayResponsePayload
> {
  constructor(options: SiopeRelayMockResponderOptions) {
    super(SIOPE_RELAY_QUEUE_KIND, options);
  }

  protected evaluate(
    request: QueueAdapterRequestEnvelope<
      SiopeRelayKind,
      SiopeRelayRequestPayload
    >,
  ): RelayDecision {
    const payload = request.payload;
    if (payload.scenario === 'TRANSIENT_ERROR') {
      return this.error(
        'RETRY',
        'TRANSIENT',
        'SIOPE_RELAY_TRANSIENT',
        'Mock SIOPE relay requested adapter retry.',
      );
    }
    if (payload.scenario === 'DEFINITIVE_ERROR') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_DEFINITIVE',
        'Mock SIOPE relay requested adapter retry.',
      );
    }
    if (!payload.exportId) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_MISSING_EXPORT',
        'SIOPE relay requests must carry an export id.',
      );
    }
    if (!payload.layoutEdition || !payload.sourceUrl) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_LAYOUT_METADATA_REQUIRED',
        'SIOPE relay requests must carry caller-selected layout metadata.',
      );
    }
    if (payload.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_SOURCE_STATUS_UNSUPPORTED',
        'SIOPE relay only accepts caller-selected official-layout artifacts.',
      );
    }

    const content = Buffer.from(payload.contentBase64, 'base64');
    const contentSha256 = this.sha256(content);
    if (content.byteLength === 0 || contentSha256 !== payload.contentHash) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SIOPE_RELAY_CONTENT_HASH_MISMATCH',
        'SIOPE relay content hash does not match the submitted artifact.',
      );
    }

    const receivedAt = this.now().toISOString();
    const requestSha256 = this.sha256String(JSON.stringify(payload));
    const protocol = [
      'SIOPE',
      String(payload.year),
      contentSha256.slice(0, 16).toUpperCase(),
    ].join('-');

    return {
      status: 'OK',
      payload: {
        relay: 'siope-relay',
        handledBy: 'siope-relay-mock',
        exportId: payload.exportId,
        sourceStatus: payload.sourceStatus,
        layoutEdition: payload.layoutEdition,
        sourceUrl: payload.sourceUrl,
        tenantIbgeCode: payload.tenantIbgeCode,
        year: payload.year,
        ack: {
          protocol,
          status: 'SANDBOX_ACK',
          receivedAt,
          message:
            'Mock SIOPE relay accepted the local education fiscal CSV artifact for queue evidence.',
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
