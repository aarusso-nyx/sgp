import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
} from './common';

export type EsocialTabelasRequestPayload =
  EsocialClassRequestPayload<'tabelas'>;

export type EsocialTabelasResponsePayload =
  EsocialClassResponsePayload<'tabelas'>;
