import type {
  EsocialClassRequestPayload,
  EsocialClassResponsePayload,
  EsocialSgpEventPayload,
} from './common';

export type EsocialTabelasRequestPayload =
  EsocialClassRequestPayload<'tabelas'>;

export type EsocialTabelasResponsePayload =
  EsocialClassResponsePayload<'tabelas'>;

export type EsocialS1000Payload = EsocialSgpEventPayload<'S-1000'>;
export type EsocialS1005Payload = EsocialSgpEventPayload<'S-1005'>;
export type EsocialS1010Payload = EsocialSgpEventPayload<'S-1010'>;
export type EsocialS1020Payload = EsocialSgpEventPayload<'S-1020'>;
export type EsocialS1030Payload = EsocialSgpEventPayload<'S-1030'>;
export type EsocialS1040Payload = EsocialSgpEventPayload<'S-1040'>;
export type EsocialS1050Payload = EsocialSgpEventPayload<'S-1050'>;
export type EsocialS1060Payload = EsocialSgpEventPayload<'S-1060'>;
export type EsocialS1070Payload = EsocialSgpEventPayload<'S-1070'>;
