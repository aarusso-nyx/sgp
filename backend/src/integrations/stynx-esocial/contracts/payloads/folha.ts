import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
} from './common';

export type EsocialFolhaRequestPayload = EsocialClassRequestPayload<'folha'>;

export type EsocialFolhaResponsePayload = EsocialClassResponsePayload<'folha'>;
