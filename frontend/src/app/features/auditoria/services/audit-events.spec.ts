import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';

import { OpenApiClient } from '../../../core/api/openapi-client';
import { AuditEvents } from './audit-events';

describe('AuditEvents', () => {
  let service: AuditEvents;

  const api = {
    getApiV1AuditoriaLogs: vi.fn(),
    postApiV1AuditoriaExportacoes: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getApiV1AuditoriaLogs.mockReturnValue(
      of({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
    );
    api.postApiV1AuditoriaExportacoes.mockReturnValue(of({ id: 'report-1' }));

    TestBed.configureTestingModule({
      providers: [{ provide: OpenApiClient, useValue: api }],
    });
    service = TestBed.inject(AuditEvents);
  });

  it('lists audit events with filters', async () => {
    await firstValueFrom(service.list({ actor: 'tester', action: 'UPDATE' }));

    expect(api.getApiV1AuditoriaLogs).toHaveBeenCalledWith({
      actor: 'tester',
      action: 'UPDATE',
    });
  });

  it('loads derived facets and requests reports', async () => {
    api.getApiV1AuditoriaLogs.mockReturnValue(
      of({
        items: [
          {
            action: 'UPDATE',
            tableName: 'employee',
            resourceType: 'employee',
            actorLogin: 'user.a',
          },
          {
            action: 'UPDATE',
            tableName: null,
            resourceType: 'rubrica',
            actorSub: 'sub-b',
          },
          {
            action: 'CREATE',
            tableName: 'employee',
            resourceType: 'employee',
            actorLogin: null,
            actorSub: null,
          },
        ],
        page: 1,
        pageSize: 25,
        total: 3,
        totalPages: 1,
      }),
    );

    await firstValueFrom(service.actionFacets({ tableName: 'employee' }));
    await firstValueFrom(service.tableFacets());
    await firstValueFrom(service.userFacets());
    await firstValueFrom(service.requestReport({ actor: 'tester' }));
    await firstValueFrom(service.list());

    api.getApiV1AuditoriaLogs.mockReturnValue(of(null));
    api.postApiV1AuditoriaExportacoes.mockReturnValue(of(null));
    const empty = await firstValueFrom(service.list());
    const report = await firstValueFrom(service.requestReport({}));

    expect(api.getApiV1AuditoriaLogs).toHaveBeenCalled();
    expect(api.postApiV1AuditoriaExportacoes).toHaveBeenCalledWith({
      actor: 'tester',
    });
    expect(empty).toMatchObject({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 });
    expect(report.status).toBe('REQUESTED');
  });
});
