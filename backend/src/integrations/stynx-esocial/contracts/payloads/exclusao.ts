import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
} from './common';

export type EsocialExclusaoRequestPayload =
  EsocialClassRequestPayload<'exclusao'>;

export type EsocialExclusaoResponsePayload =
  EsocialClassResponsePayload<'exclusao'>;
