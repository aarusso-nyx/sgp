import { CatEmissionService, nextBusinessDay } from './cat-emission.service';

describe('CatEmissionService deadline calculation', () => {
  it('sets initial CAT deadline to the next business day', () => {
    expect(
      nextBusinessDay(new Date('2026-05-01T10:00:00.000Z')).toISOString(),
    ).toBe('2026-05-04T10:00:00.000Z');
  });

  it('uses immediate deadline for death CAT', () => {
    const service = new CatEmissionService({ configured: true } as never);
    const emittedAt = new Date('2026-05-02T12:30:00.000Z');

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
