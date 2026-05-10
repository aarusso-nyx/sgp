import {
  ESOCIAL_RELAY_EVENT_CLASSES,
  type EsocialRelayEventClass,
} from '../../backend/src/integrations/stynx-esocial/contracts';

describe('stynx-esocial event class contract', () => {
  it('keeps missing audit events in SGP as producer DTO classes only', () => {
    const requiredSgpProducerClasses: EsocialRelayEventClass[] = [
      'S-1202',
      'S-1207',
      'S-1298',
      'S-2400',
      'S-2405',
      'S-2410',
      'S-2416',
      'S-2418',
      'S-2420',
      'S-2555',
    ];

    expect(ESOCIAL_RELAY_EVENT_CLASSES).toEqual(
      expect.arrayContaining(requiredSgpProducerClasses),
    );
  });
});
