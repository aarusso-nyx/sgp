export const ESOCIAL_CLASSES = [
  'submit',
  'tabelas',
  'trabalhador',
  'folha',
  'fechamento',
  'exclusao',
  'retorno',
  'certificado',
] as const;

export type EsocialClass = (typeof ESOCIAL_CLASSES)[number];

export const ESOCIAL_SUBMIT_CLASS = 'submit' satisfies EsocialClass;

// Legacy SGP in-process queue adapter kind. R6 keeps this runtime value stable;
// stynx-esocial topic taxonomy is introduced alongside it by class.
export const ESOCIAL_RELAY_QUEUE_KIND = 'esocial' as const;

export type EsocialRelayKind = typeof ESOCIAL_RELAY_QUEUE_KIND;

export const ESOCIAL_RELAY_EVENT_CLASSES = [
  'S-1000',
  'S-1005',
  'S-1010',
  'S-1020',
  'S-1030',
  'S-1040',
  'S-1050',
  'S-1060',
  'S-1070',
  'S-1200',
  'S-1202',
  'S-1207',
  'S-1210',
  'S-1260',
  'S-1270',
  'S-1280',
  'S-1298',
  'S-1299',
  'S-2200',
  'S-2205',
  'S-2206',
  'S-2210',
  'S-2220',
  'S-2221',
  'S-2230',
  'S-2240',
  'S-2250',
  'S-2298',
  'S-2299',
  'S-2300',
  'S-2306',
  'S-2399',
  'S-2400',
  'S-2405',
  'S-2410',
  'S-2416',
  'S-2418',
  'S-2420',
  'S-2501',
  'S-2555',
  'S-3000',
  'S-5001',
  'S-5002',
  'S-5003',
  'S-5011',
  'S-5012',
  'S-5013',
] as const;

export type EsocialRelayEventClass =
  (typeof ESOCIAL_RELAY_EVENT_CLASSES)[number];

export type EsocialRelayScenario =
  | 'ACCEPT'
  | 'TRANSIENT_ERROR'
  | 'DEFINITIVE_ERROR';
