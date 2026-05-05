import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
} from './common';

export type EsocialRetornoRequestPayload =
  EsocialClassRequestPayload<'retorno'>;

export type EsocialRetornoResponsePayload =
  EsocialClassResponsePayload<'retorno'>;
