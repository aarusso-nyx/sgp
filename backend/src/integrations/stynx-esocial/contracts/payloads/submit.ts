import type { EsocialPadesPkcs7Envelope } from '../../../../auth/govbr/software-pades-pkcs7.signer';
import type { EsocialRelayEventClass, EsocialRelayScenario } from '../kinds';

export type EsocialRelayRequestPayload = Readonly<{
  batchId: string;
  environment: 'PRODUCTION' | 'QUALIFICATION';
  endpointUrl: string;
  eventIds: string[];
  eventClass: EsocialRelayEventClass;
  signedEnvelope: EsocialPadesPkcs7Envelope;
  scenario?: EsocialRelayScenario | undefined;
}>;

export type EsocialRelayResponsePayload = Readonly<{
  relay: 'esocial-relay';
  batchId: string;
  eventIds: string[];
  eventClass: EsocialRelayEventClass;
  ack: {
    responseCode: '201';
    responseDescription: 'Lote recebido com sucesso';
    protocolNumber: string;
    receivedAt: string;
  };
  receipt: {
    responseCode: '201';
    responseDescription: 'Sucesso.';
    receiptNumber: string;
    processedAt: string;
  };
  hashes: {
    requestSha256: string;
    payloadSha256: string;
    pkcs7Sha256: string;
  };
  xsd: {
    valid: true;
    eventKind: EsocialRelayEventClass;
    xsdPath: string;
  };
  httpStatus: 200;
  soapRequest: string;
  soapResponse: string;
}>;
