import type { QueueAdapterRequestEnvelope } from '../../../common/adapters';
import {
  OfficialLayoutRelayMockResponderBase,
  type OfficialLayoutRelayDecision,
  type OfficialLayoutRelayMockResponderOptions,
  type OfficialLayoutRelayScenario,
} from '../official-layout-relay.mock';

export const SICONFI_RELAY_QUEUE_KIND = 'siconfi' as const;

export type SiconfiRelayKind = typeof SICONFI_RELAY_QUEUE_KIND;
export type SiconfiRelayScenario = OfficialLayoutRelayScenario;

export type SiconfiRelayRequestPayload = Readonly<{
  submissionId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  declaration: 'RREO' | 'RGF';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  period: string;
  contentHash: string;
  contentBase64: string;
  scenario?: SiconfiRelayScenario | undefined;
}>;

export type SiconfiRelayResponsePayload = Readonly<{
  relay: 'siconfi-relay';
  handledBy: 'siconfi-relay-mock';
  submissionId: string;
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  declaration: 'RREO' | 'RGF';
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

type RelayDecision = OfficialLayoutRelayDecision<SiconfiRelayResponsePayload>;
export type SiconfiRelayMockResponderOptions =
  OfficialLayoutRelayMockResponderOptions;

export class SiconfiRelayMockResponder extends OfficialLayoutRelayMockResponderBase<
  SiconfiRelayKind,
  SiconfiRelayRequestPayload,
  SiconfiRelayResponsePayload
> {
  constructor(options: SiconfiRelayMockResponderOptions) {
    super(SICONFI_RELAY_QUEUE_KIND, options);
  }

  protected evaluate(
    request: QueueAdapterRequestEnvelope<
      SiconfiRelayKind,
      SiconfiRelayRequestPayload
    >,
  ): RelayDecision {
    const payload = request.payload;
    if (payload.scenario === 'TRANSIENT_ERROR') {
      return this.error(
        'RETRY',
        'TRANSIENT',
        'SICONFI_RELAY_TRANSIENT',
        'Mock SICONFI relay requested adapter retry.',
      );
    }
    if (payload.scenario === 'DEFINITIVE_ERROR') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_DEFINITIVE',
        'Mock SICONFI relay requested adapter retry.',
      );
    }
    if (!payload.submissionId) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_MISSING_SUBMISSION',
        'SICONFI relay requests must carry a submission id.',
      );
    }
    if (!payload.layoutEdition || !payload.sourceUrl) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_LAYOUT_METADATA_REQUIRED',
        'SICONFI relay requests must carry caller-selected layout metadata.',
      );
    }
    if (payload.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_SOURCE_STATUS_UNSUPPORTED',
        'SICONFI relay only accepts caller-selected official-layout artifacts.',
      );
    }

    const content = Buffer.from(payload.contentBase64, 'base64');
    const contentSha256 = this.sha256(content);
    if (content.byteLength === 0 || contentSha256 !== payload.contentHash) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'SICONFI_RELAY_CONTENT_HASH_MISMATCH',
        'SICONFI relay content hash does not match the submitted artifact.',
      );
    }

    const receivedAt = this.now().toISOString();
    const requestSha256 = this.sha256String(JSON.stringify(payload));
    const protocol = [
      'SICONFI',
      payload.declaration,
      payload.period,
      contentSha256.slice(0, 16).toUpperCase(),
    ].join('-');

    return {
      status: 'OK',
      payload: {
        relay: 'siconfi-relay',
        handledBy: 'siconfi-relay-mock',
        submissionId: payload.submissionId,
        sourceStatus: payload.sourceStatus,
        declaration: payload.declaration,
        layoutEdition: payload.layoutEdition,
        sourceUrl: payload.sourceUrl,
        tenantIbgeCode: payload.tenantIbgeCode,
        period: payload.period,
        ack: {
          protocol,
          status: 'SANDBOX_ACK',
          receivedAt,
          message:
            'Mock SICONFI relay accepted the local fiscal CSV artifact for queue evidence.',
        },
        boundary: {
          transmission: 'OUT_OF_SCOPE',
          acceptance: 'NOT_ASSERTED',
        },
        hashes: {
          requestSha256,
          contentSha256,
          evidenceHash: this.sha256String(
            `${payload.submissionId}:${request.tenant_id}:${contentSha256}`,
          ),
        },
      },
    };
  }
}
