import { createHash } from 'node:crypto';

import {
  adapterQueueTopics,
  type QueueAdapterErrorEnvelope,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
  type QueueSubscription,
} from '../../../common/adapters';
import type {
  RreoFiscalReportEnvelope,
  TceFiscalReportStateCode,
  TceFiscalReportType,
} from '../../../tce/builders/rreo.builder';
import type { RgfFiscalReportEnvelope } from '../../../tce/builders/rgf.builder';

export const TCE_RELAY_QUEUE_KIND = 'tce' as const;

export type TceRelayKind = typeof TCE_RELAY_QUEUE_KIND;
export type TceRelayScenario =
  'ACCEPT' | 'TRANSIENT_ERROR' | 'DEFINITIVE_ERROR';
export type TceRelayFiscalReportEnvelope =
  RreoFiscalReportEnvelope | RgfFiscalReportEnvelope;

export type TceRelayRequestPayload = Readonly<{
  submissionId: string;
  report: TceRelayFiscalReportEnvelope;
  scenario?: TceRelayScenario | undefined;
}>;

export type TceRelaySpAck = Readonly<{
  stateCode: 'SP';
  audesp: {
    protocoloAudesp: string;
    situacao: 'RECEBIDO_EM_AMBIENTE_SIMULADO';
    reciboLocal: string;
    mensagem: string;
  };
}>;

export type TceRelayMgAck = Readonly<{
  stateCode: 'MG';
  sicom: {
    numeroProtocolo: string;
    situacao: 'RECEBIDO_EM_AMBIENTE_SIMULADO';
    hashPacote: string;
    mensagem: string;
  };
}>;

export type TceRelayStateAck = TceRelaySpAck | TceRelayMgAck;

export type TceRelayResponsePayload = Readonly<{
  relay: 'tce-relay';
  handledBy: 'tce-relay-mock';
  submissionId: string;
  reportType: TceFiscalReportType;
  stateCode: TceFiscalReportStateCode;
  adapterId: string;
  courtName: string;
  systemName: string;
  officialConformance: false;
  ack: {
    protocol: string;
    status: 'SANDBOX_ACK';
    receivedAt: string;
    message: string;
  };
  stateAck: TceRelayStateAck;
  hashes: {
    requestSha256: string;
    reportSha256: string;
    evidenceHash: string;
  };
}>;

type RelayDecision =
  | {
      status: 'OK';
      payload: TceRelayResponsePayload;
    }
  | {
      status: 'RETRY' | 'DEAD_LETTER';
      error: QueueAdapterErrorEnvelope;
    };

export type TceRelayMockResponderOptions = Readonly<{
  transport: QueueAdapterTransport;
  concurrency?: number | undefined;
  now?: (() => Date) | undefined;
}>;

export class TceRelayMockResponder {
  private readonly transport: QueueAdapterTransport;
  private readonly now: () => Date;
  private readonly subscription: QueueSubscription;

  constructor(options: TceRelayMockResponderOptions) {
    this.transport = options.transport;
    this.now = options.now ?? (() => new Date());
    this.subscription = this.transport.subscribe<
      QueueAdapterRequestEnvelope<TceRelayKind, TceRelayRequestPayload>
    >(
      adapterQueueTopics(TCE_RELAY_QUEUE_KIND).request,
      (request) => this.handleRequest(request),
      { concurrency: options.concurrency ?? 4 },
    );
  }

  close(): void {
    this.subscription.unsubscribe();
  }

  private async handleRequest(
    request: QueueAdapterRequestEnvelope<TceRelayKind, TceRelayRequestPayload>,
  ): Promise<void> {
    const decision = this.evaluate(request);
    const response = this.buildResponse(request, decision);
    await this.transport.publish(request['reply-to'], response);
  }

  private evaluate(
    request: QueueAdapterRequestEnvelope<TceRelayKind, TceRelayRequestPayload>,
  ): RelayDecision {
    const payload = request.payload;
    if (payload.scenario === 'TRANSIENT_ERROR') {
      return this.error('RETRY', 'TRANSIENT', 'TCE_RELAY_TRANSIENT');
    }
    if (payload.scenario === 'DEFINITIVE_ERROR') {
      return this.error('DEAD_LETTER', 'DEFINITIVE', 'TCE_RELAY_DEFINITIVE');
    }

    const report = payload.report;
    if (!payload.submissionId) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'TCE_RELAY_MISSING_SUBMISSION',
        'TCE relay requests must carry the persisted submission id.',
      );
    }
    if (report.entity.tenantId !== request.tenant_id) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'TCE_RELAY_TENANT_MISMATCH',
        'Fiscal report tenant does not match queue envelope tenant.',
      );
    }
    if (report.officialConformance !== false) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'TCE_RELAY_OFFICIAL_CONFORMANCE_UNSUPPORTED',
        'Mock TCE relay only accepts source-pending local envelopes.',
      );
    }
    if (!['SP', 'MG'].includes(report.target.stateCode)) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'TCE_RELAY_UNSUPPORTED_STATE',
        'Mock TCE relay currently accepts SP and MG fiscal report payloads.',
      );
    }
    if (
      (report.reportType === 'RREO' &&
        report.schemaVersion !== 'tce-rreo-v01') ||
      (report.reportType === 'RGF' && report.schemaVersion !== 'tce-rgf-v01')
    ) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'TCE_RELAY_SCHEMA_VERSION_UNSUPPORTED',
        'Mock TCE relay only accepts R4-15 fiscal report schema versions.',
      );
    }
    if (!Array.isArray(report.statements) || report.statements.length === 0) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'TCE_RELAY_EMPTY_REPORT',
        'TCE fiscal report relay requests must carry statement lines.',
      );
    }

    const receivedAt = this.now().toISOString();
    const requestSha256 = sha256(JSON.stringify(payload));
    const reportSha256 = sha256(JSON.stringify(report));
    const protocol = [
      'TCE',
      report.target.stateCode,
      report.reportType,
      report.evidenceHash.slice(0, 16).toUpperCase(),
    ].join('-');

    return {
      status: 'OK',
      payload: {
        relay: 'tce-relay',
        handledBy: 'tce-relay-mock',
        submissionId: payload.submissionId,
        reportType: report.reportType,
        stateCode: report.target.stateCode,
        adapterId: report.target.adapterId,
        courtName: report.target.courtName,
        systemName: report.target.systemName,
        officialConformance: false,
        ack: {
          protocol,
          status: 'SANDBOX_ACK',
          receivedAt,
          message: [
            'Mock TCE relay accepted source-pending',
            report.reportType,
            report.target.stateCode,
            'payload for local queue evidence.',
          ].join(' '),
        },
        stateAck: buildStateAck(report, protocol),
        hashes: {
          requestSha256,
          reportSha256,
          evidenceHash: report.evidenceHash,
        },
      },
    };
  }

  private buildResponse(
    request: QueueAdapterRequestEnvelope<TceRelayKind, TceRelayRequestPayload>,
    decision: RelayDecision,
  ): QueueAdapterResponseEnvelope<TceRelayKind, TceRelayResponsePayload> {
    return {
      'request-id': request['request-id'],
      'correlation-id': request['correlation-id'],
      'created-at': this.now().toISOString(),
      tenant_id: request.tenant_id,
      kind: request.kind,
      status: decision.status,
      attempt: request.attempt,
      payload: decision.status === 'OK' ? decision.payload : undefined,
      error: decision.status === 'OK' ? undefined : decision.error,
    };
  }

  private error(
    status: 'RETRY' | 'DEAD_LETTER',
    kind: QueueAdapterErrorEnvelope['kind'],
    code: string,
    message = 'Mock TCE relay requested adapter retry.',
  ): RelayDecision {
    return {
      status,
      error: {
        kind,
        code,
        message,
      },
    };
  }
}

function buildStateAck(
  report: TceRelayFiscalReportEnvelope,
  protocol: string,
): TceRelayStateAck {
  if (report.target.stateCode === 'SP') {
    return {
      stateCode: 'SP',
      audesp: {
        protocoloAudesp: `AUDESP-${protocol}`,
        situacao: 'RECEBIDO_EM_AMBIENTE_SIMULADO',
        reciboLocal: `SP-${report.period.fiscalYear}-${report.period.periodNumber}-${report.evidenceHash.slice(
          0,
          12,
        )}`,
        mensagem: 'AUDESP/SP mock relay received the local fiscal envelope.',
      },
    };
  }

  return {
    stateCode: 'MG',
    sicom: {
      numeroProtocolo: `SICOM-${protocol}`,
      situacao: 'RECEBIDO_EM_AMBIENTE_SIMULADO',
      hashPacote: report.evidenceHash,
      mensagem: 'SICOM/TCE-MG mock relay received the local fiscal envelope.',
    },
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
