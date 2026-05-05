import { MasterDataService } from './master-data.service';
import { TEST_INSTANT_2026_05_04T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('Vacation type master-data resource', () => {
  const row = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'REG',
    name: 'Ferias regulares',
    description: 'Ferias regulares',
    active: true,
    metadata: {},
    created_at: new Date(TEST_INSTANT_2026_05_04T00_00_00_000Z),
    updated_at: new Date(TEST_INSTANT_2026_05_04T00_00_00_000Z),
  };

  it('lists, creates, updates, and deactivates hr.vacation_type through tipoFerias', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('count(*)::text AS total')) {
        return [{ total: '1' }];
      }
      if (sql.includes(`status = 'INACTIVE'::"RecordStatus"`)) {
        return [{ ...row, active: false }];
      }
      return [row];
    });
    const service = new MasterDataService({
      configured: true,
      query,
    } as never);
    const mutation = {
      code: 'REG',
      name: 'Ferias regulares',
      description: 'Ferias regulares',
      active: true,
    };

    await expect(
      service.listRecords('tipoFerias', { page: 1, pageSize: 10 }),
    ).resolves.toMatchObject({
      items: [expect.objectContaining({ code: 'REG' })],
    });
    await expect(
      service.createRecord('tipoFerias', mutation),
    ).resolves.toHaveProperty('code', 'REG');
    await expect(
      service.updateRecord('tipoFerias', row.id, {
        ...mutation,
        description: 'Ferias especiais',
      }),
    ).resolves.toHaveProperty('id', row.id);
    await expect(
      service.deactivateRecord('tipoFerias', row.id),
    ).resolves.toHaveProperty('active', false);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM hr.vacation_type'),
      expect.any(Array),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.vacation_type'),
      expect.arrayContaining(['REG', 'Ferias regulares', 'ACTIVE']),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE hr.vacation_type'),
      expect.arrayContaining([row.id, 'REG', 'Ferias especiais', 'ACTIVE']),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(`status = 'INACTIVE'::"RecordStatus"`),
      [row.id],
    );
  });
});
