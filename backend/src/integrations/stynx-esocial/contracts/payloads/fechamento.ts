import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
} from './common';

export type EsocialFechamentoRequestPayload =
  EsocialClassRequestPayload<'fechamento'>;

export type EsocialFechamentoResponsePayload =
  EsocialClassResponsePayload<'fechamento'>;
