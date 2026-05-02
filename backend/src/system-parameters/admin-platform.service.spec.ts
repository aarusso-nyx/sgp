import { AdminPlatformService } from './admin-platform.service';

describe('AdminPlatformService', () => {
  it('returns tenant and import job placeholders', () => {
    const service = new AdminPlatformService({ configured: false } as never);

    expect(service.createTenant({ name: 'Tenant' })).toMatchObject({
      status: 'ACTIVE',
      name: 'Tenant',
    });
    expect(service.patchTenant('tenant-1', { name: 'Updated' })).toMatchObject({
      id: 'tenant-1',
      name: 'Updated',
    });
    const job = service.startTenantImport('tenant-1', { source: 'seed' });
    expect(service.importProgress('tenant-1', job.jobId)).toMatchObject({
      status: 'RUNNING',
      progress: 5,
    });
    expect(service.importProgress('tenant-2', job.jobId)).toMatchObject({
      status: 'NOT_FOUND',
      progress: 0,
    });
  });

  it('queues eSocial reprocessing with and without database persistence', async () => {
    await expect(
      new AdminPlatformService({
        configured: false,
      } as never).reprocessEsocialEvent('event-1'),
    ).resolves.toMatchObject({
      eventId: 'event-1',
      status: 'REPROCESS_QUEUED',
    });

    const query = jest.fn(async (sql: string) =>
      sql.includes('RETURNING id::text') ? [{ id: 'definition-1' }] : [],
    );
    const service = new AdminPlatformService({
      configured: true,
      query,
    } as never);

    await expect(
      service.reprocessEsocialEvent('event-1'),
    ).resolves.toMatchObject({
      eventId: 'event-1',
      status: 'REPROCESS_QUEUED',
    });
    await expect(
      service.updateEsocialCertificate({ serial: '123', password: 'secret' }),
    ).resolves.toMatchObject({ updated: true, serial: '123' });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.report_request'),
      ['definition-1', JSON.stringify({ eventId: 'event-1', format: 'XML' })],
    );
  });

  it('accepts certificate updates without database persistence', async () => {
    await expect(
      new AdminPlatformService({
        configured: false,
      } as never).updateEsocialCertificate({ serial: 'offline' }),
    ).resolves.toMatchObject({ updated: true, serial: 'offline' });
  });
});
