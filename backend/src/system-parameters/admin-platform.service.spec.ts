import { AdminPlatformService } from './admin-platform.service';

describe('AdminPlatformService', () => {
  it('returns tenant and import job placeholders', () => {
    const service = new AdminPlatformService();

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
});
