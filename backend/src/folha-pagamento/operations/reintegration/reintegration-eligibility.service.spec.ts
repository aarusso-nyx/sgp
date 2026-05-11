import { BadRequestException } from '@nestjs/common';

import { RequestContextStore } from '../../../common/request-context/request-context.store';
import { ReintegrationEligibilityService } from './reintegration-eligibility.service';

describe('ReintegrationEligibilityService branch behavior', () => {
  it('uses actor tenant context and validates required dates', () => {
    const service = new ReintegrationEligibilityService();

    RequestContextStore.run(
      {
        actor: {
          tenantId: 'tenant-from-actor',
          id: 'actor',
          type: 'user',
          roles: [],
          permissions: [],
        },
        tenantId: 'tenant-from-root',
        permissions: [],
      },
      () => {
        expect(service.currentTenantId()).toBe('tenant-from-actor');
      },
    );
    expect(() => service.currentTenantId()).toThrow(
      'Tenant context is required',
    );
    expect(() => service.dateOnly(null)).toThrow(BadRequestException);
  });

  it('resolves active status from link or database and rejects missing active status', async () => {
    const service = new ReintegrationEligibilityService();

    await expect(
      service.resolveActiveStatusId({ query: jest.fn() } as never, 'tenant', {
        functional_status_id: 'status-from-link',
      } as never),
    ).resolves.toBe('status-from-link');
    await expect(
      service.resolveActiveStatusId(
        {
          query: jest.fn(async () => ({
            rows: [{ id: 'active-status' }],
          })),
        } as never,
        'tenant',
        { functional_status_id: null } as never,
      ),
    ).resolves.toBe('active-status');
    await expect(
      service.resolveActiveStatusId(
        {
          query: jest.fn(async () => ({ rows: [] })),
        } as never,
        'tenant',
        { functional_status_id: null } as never,
      ),
    ).rejects.toThrow('Active functional status not found');
  });

  it('resolves termination events by explicit id, fallback lookup, and missing evidence', async () => {
    const service = new ReintegrationEligibilityService();
    const explicitClient = {
      query: jest.fn(async () => ({
        rows: [{ id: 'explicit', receipt: 'R1' }],
      })),
    };
    await expect(
      service.resolveTerminationEvent(
        explicitClient as never,
        'tenant',
        'link',
        {
          employmentLinkId: 'link',
          reinstatementDate: '2026-05-01',
          decisionDate: '2026-05-02',
          kind: 'JUDICIAL',
          originalTerminationEventId: 'event',
        } as never,
      ),
    ).resolves.toEqual({ id: 'explicit', receipt: 'R1' });

    const fallbackClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'fallback', receipt: 'R2' }] }),
    };
    await expect(
      service.resolveTerminationEvent(
        fallbackClient as never,
        'tenant',
        'link',
        {
          employmentLinkId: 'link',
          reinstatementDate: '2026-05-01',
          decisionDate: '2026-05-02',
          kind: 'JUDICIAL',
          originalTerminationEventId: 'missing',
          originalS2299Receipt: 'manual-receipt',
        } as never,
      ),
    ).resolves.toEqual({ id: 'fallback', receipt: 'R2' });
    await expect(
      service.resolveTerminationEvent(
        { query: jest.fn(async () => ({ rows: [] })) } as never,
        'tenant',
        'link',
        {} as never,
      ),
    ).rejects.toThrow('Original S-2299 event not found');
  });
});
