import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
} from './common';

export type EsocialTrabalhadorRequestPayload =
  EsocialClassRequestPayload<'trabalhador'>;

export type EsocialTrabalhadorResponsePayload =
  EsocialClassResponsePayload<'trabalhador'>;
