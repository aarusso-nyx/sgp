import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TransparencyPublishService } from './transparency-publish.service';

describe('TransparencyPublishService', () => {
  it('delegates to the approved-run publish function', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        competence: '2026-04-01',
        snapshot_hash: 'hash-1',
        row_count: 2,
      },
    ]);
    const service = new TransparencyPublishService({
      configured: true,
      query,
    } as never);

    await expect(
      service.publish(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000003',
      ),
    ).resolves.toEqual({
      competence: '2026-04-01',
      snapshotHash: 'hash-1',
      rowCount: 2,
    });
    expect(query.mock.calls[0][0]).toContain('publish_transparency_snapshot');
    expect(query.mock.calls[0][1]).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
    ]);
  });

  it('keeps the approved-run guard in SQL', () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        '../../../prisma/migrations/20260502060000_xcut_02_transparency/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain("run.status = 'APPROVED'");
    expect(migration).toContain('tenant.transparency_enabled = true');
  });
});
