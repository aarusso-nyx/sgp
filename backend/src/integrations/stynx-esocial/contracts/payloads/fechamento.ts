import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
  EsocialSgpEventPayload,
} from './common';

export type EsocialFechamentoRequestPayload =
  EsocialClassRequestPayload<'fechamento'>;

export type EsocialFechamentoResponsePayload =
  EsocialClassResponsePayload<'fechamento'>;

export type EsocialS1298Payload = EsocialSgpEventPayload<'S-1298'>;
