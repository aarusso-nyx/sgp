import { Test } from '@nestjs/testing';
import { STYNX_AUDIT_SINK } from '@stynx-nyx/backend';

import { AuditWriterService } from '../audit/audit-writer.service';
import { DatabaseService } from '../database/database.service';
import { SgpStynxAuditModule } from './sgp-stynx-audit.module';

describe('SGP STYNX audit composition', () => {
  it('binds the STYNX sink to the immutable SGP SQL writer', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      imports: [SgpStynxAuditModule.forRoot()],
    })
      .overrideProvider(DatabaseService)
      .useValue({ configured: true, query })
      .compile();

    const writer = moduleRef.get(AuditWriterService);
    expect(moduleRef.get(STYNX_AUDIT_SINK)).toBe(writer);

    await writer.write({
      occurredAt: '2026-07-12T00:00:00.000Z',
      action: 'update',
      entity: 'employee',
      entityId: 'employee-1',
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      requestId: 'request-1',
      metadata: { authorization: 'Bearer secret', safe: 'retained' },
    });

    expect(query).toHaveBeenCalledTimes(1);
    const values = query.mock.calls[0]?.[1] as unknown[];
    expect(values.slice(0, 7)).toEqual([
      'UPDATE',
      'employee',
      'employee-1',
      'actor-1',
      'actor-1',
      null,
      'request-1',
    ]);
    expect(String(values[7])).not.toContain('Bearer secret');
    expect(String(values[7])).toContain('retained');

    await moduleRef.close();
  });
});
