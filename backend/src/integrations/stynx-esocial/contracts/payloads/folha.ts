import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
  EsocialSgpEventPayload,
} from './common';

export type EsocialFolhaRequestPayload = EsocialClassRequestPayload<'folha'>;

export type EsocialFolhaResponsePayload = EsocialClassResponsePayload<'folha'>;

export type EsocialS1202Payload = EsocialSgpEventPayload<'S-1202'>;
export type EsocialS1207Payload = EsocialSgpEventPayload<'S-1207'>;
export type EsocialS1260Payload = EsocialSgpEventPayload<'S-1260'>;
export type EsocialS1270Payload = EsocialSgpEventPayload<'S-1270'>;
export type EsocialS1280Payload = EsocialSgpEventPayload<'S-1280'>;
