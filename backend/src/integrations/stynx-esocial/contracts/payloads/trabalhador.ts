import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
  EsocialSgpEventPayload,
} from './common';

export type EsocialTrabalhadorRequestPayload =
  EsocialClassRequestPayload<'trabalhador'>;

export type EsocialTrabalhadorResponsePayload =
  EsocialClassResponsePayload<'trabalhador'>;

export type EsocialS2205Payload = EsocialSgpEventPayload<'S-2205'>;
export type EsocialS2206Payload = EsocialSgpEventPayload<'S-2206'>;
export type EsocialS2221Payload = EsocialSgpEventPayload<'S-2221'>;
export type EsocialS2230Payload = EsocialSgpEventPayload<'S-2230'>;
export type EsocialS2250Payload = EsocialSgpEventPayload<'S-2250'>;
export type EsocialS2555Payload = EsocialSgpEventPayload<'S-2555'>;
