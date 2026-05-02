import { UnprocessableEntityException } from '@nestjs/common';

import { LayoutVersionService } from './layout-version.service';

describe('LayoutVersionService', () => {
  it('does not allow two overlapping ACTIVE versions for the same state and system', async () => {
    const database = new FakeLayoutVersionDatabase();
    const service = new LayoutVersionService(database as never);

    await expect(
      service.transition('layout-overlap', 'ACTIVE'),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

class FakeLayoutVersionDatabase {
  readonly configured = true;

  async query<T>(sql: string, values: readonly unknown[] = []): Promise<T[]> {
    if (sql.includes('WHERE layout.id = $1::uuid')) {
      return [
        {
          id: values[0],
          state_id: 'state-sp',
          state_code: 'SP',
          system_name: 'AUDESP',
          version: '0.0.2',
          effective_from: '2026-01-01',
          effective_to: null,
          status: 'DRAFT',
          publication_url: 'https://www.tce.sp.gov.br/audesp',
          notes: null,
        },
      ] as T[];
    }

    if (sql.includes('UPDATE tce.layout_version')) {
      const error = new Error(
        'active layout version effective period overlaps for state and system',
      ) as Error & {
        code: string;
      };
      error.code = '23P01';
      throw error;
    }

    return [] as T[];
  }
}
