import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
} from './common';

export type EsocialCertificadoRequestPayload =
  EsocialClassRequestPayload<'certificado'>;

export type EsocialCertificadoResponsePayload =
  EsocialClassResponsePayload<'certificado'>;
