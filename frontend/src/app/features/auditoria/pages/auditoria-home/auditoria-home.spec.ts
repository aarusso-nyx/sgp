import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuditoriaModule } from '../../auditoria-module';
import { AuditEvents } from '../../services/audit-events';
import { AuditoriaHome } from './auditoria-home';

describe('AuditoriaHome', () => {
  let component: AuditoriaHome;
  let fixture: ComponentFixture<AuditoriaHome>;

  const auditEvents = {
    list: vi.fn(),
    actionFacets: vi.fn(),
    tableFacets: vi.fn(),
    userFacets: vi.fn(),
    requestReport: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    auditEvents.list.mockReturnValue(
      of({
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        items: [
          {
            id: 'evt-1',
            occurredAt: '2026-01-02T03:04:05.000Z',
            actorLogin: 'tester',
            actorSub: 'sub-1',
            action: 'UPDATE',
            resourceType: 'employee',
            resourceId: 'emp-1',
            tableName: 'employee',
            requestId: 'req-1',
            ipAddress: '127.0.0.1',
            userAgent: 'agent',
            statusCode: 200,
            metadata: { method: 'PATCH' },
          },
        ],
      }),
    );
    auditEvents.actionFacets.mockReturnValue(of([{ value: 'UPDATE', label: 'UPDATE', count: 1 }]));
    auditEvents.tableFacets.mockReturnValue(
      of([{ value: 'employee', label: 'employee', count: 1 }]),
    );
    auditEvents.userFacets.mockReturnValue(of([{ value: 'tester', label: 'tester', count: 1 }]));
    auditEvents.requestReport.mockReturnValue(of({ id: 'report-1' }));

    await TestBed.configureTestingModule({
      imports: [AuditoriaModule],
      providers: [{ provide: AuditEvents, useValue: auditEvents }],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads audit events and facets', () => {
    expect(component.records[0].id).toBe('evt-1');
    expect(component.actionFacets[0].value).toBe('UPDATE');
  });

  it('applies filters to the audit query', () => {
    component.filters.patchValue({ actor: 'tester', action: 'UPDATE' });
    component.applyFilters();

    expect(auditEvents.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ actor: 'tester', action: 'UPDATE' }),
    );
  });

  it('shows selected row details and requests reports', () => {
    component.handleRowAction({ actionId: 'details', row: component.records[0] });
    component.requestReport();

    expect(component.selected?.id).toBe('evt-1');
    expect(auditEvents.requestReport).toHaveBeenCalledWith(
      expect.objectContaining({ parameters: expect.any(Object) }),
    );
  });
});
