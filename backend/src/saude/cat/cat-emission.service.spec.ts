import { CatEmissionService, nextBusinessDay } from './cat-emission.service';
import {
  TEST_INSTANT_2026_05_01T10_00_00_000Z,
  TEST_INSTANT_2026_05_02T12_30_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';

describe('CatEmissionService deadline calculation', () => {
  it('sets initial CAT deadline to the next business day', () => {
    expect(
      nextBusinessDay(
        new Date(TEST_INSTANT_2026_05_01T10_00_00_000Z),
      ).toISOString(),
    ).toBe('2026-05-04T10:00:00.000Z');
  });

  it('uses immediate deadline for death CAT', () => {
    const service = new CatEmissionService({ configured: true } as never);
    const emittedAt = new Date(TEST_INSTANT_2026_05_02T12_30_00_000Z);

    expect(
      service
        .deadlineFor(
          {
            accident_at: '2026-05-01T10:00:00.000Z',
            death_at: '2026-05-02T12:00:00.000Z',
          },
          'OBITO',
          emittedAt,
        )
        .toISOString(),
    ).toBe('2026-05-02T12:30:00.000Z');
  });
});
