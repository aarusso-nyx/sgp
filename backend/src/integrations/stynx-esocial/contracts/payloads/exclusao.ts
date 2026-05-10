import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
  EsocialSgpEventPayload,
} from './common';

export type EsocialExclusaoRequestPayload =
  EsocialClassRequestPayload<'exclusao'>;

export type EsocialExclusaoResponsePayload =
  EsocialClassResponsePayload<'exclusao'>;

export type EsocialS3000Payload = EsocialSgpEventPayload<'S-3000'>;
