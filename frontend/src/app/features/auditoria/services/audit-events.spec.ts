import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { OpenApiClient } from '../../../core/api/generated/openapi-client';
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

  it('lists audit events with filters', () => {
    service.list({ actor: 'tester', action: 'UPDATE' }).subscribe();

    expect(api.getApiV1AuditoriaLogs).toHaveBeenCalledWith({
      actor: 'tester',
      action: 'UPDATE',
    });
  });

  it('loads derived facets and requests reports', () => {
    service.actionFacets({ tableName: 'employee' }).subscribe();
    service.tableFacets().subscribe();
    service.userFacets().subscribe();
    service.requestReport({ actor: 'tester' }).subscribe();

    expect(api.getApiV1AuditoriaLogs).toHaveBeenCalled();
    expect(api.postApiV1AuditoriaExportacoes).toHaveBeenCalledWith({
      actor: 'tester',
    });
  });
});
