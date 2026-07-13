import { AuditWriterService } from './audit-writer.service';
import { prometheusRegistry } from '../common/observability/prometheus.metrics';

describe('AuditWriterService', () => {
  it('appends mutation metadata with request context and redaction', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new AuditWriterService({
      configured: true,
      query,
    } as never);

    await service.auditMutation(
      {
        requestId: 'req-1',
        method: 'PATCH',
        originalUrl: '/payroll/runs/1/status',
        ip: '::1',
        headers: { 'user-agent': 'agent' },
        actor: {
          sub: 'sub-1',
          username: 'tester',
          tenantId: '00000000-0000-0000-0000-000000000100',
          groups: ['SGP_FOLHA'],
          permissions: [],
        },
      } as never,
      'UPDATE',
      'payroll_run',
      {
        resourceId: 'pr-1',
        tableName: 'payroll_run',
        metadata: { status: 'PAID', token: 'secret-token' },
      },
    );

    const writeCall = query.mock.calls[0] as [string, unknown[]];
    const values = writeCall[1];
    const metadata = JSON.parse(values[8] as string) as Record<string, unknown>;
    expect(values.slice(0, 8)).toEqual([
      'UPDATE',
      'payroll_run',
      'pr-1',
      null,
      'sub-1',
      'tester',
      'payroll_run',
      'req-1',
    ]);
    expect(metadata['token']).toBe('[REDACTED]');
    expect(metadata['method']).toBe('PATCH');
    expect(metadata['userAgent']).toBe('agent');
    expect(values[10]).toBe('127.0.0.1');
    expect(values[11]).toBe('agent');
    expect(prometheusRegistry.collect()).toContain(
      'sgp_audit_events_emitted_total{controller="unknown",route="/payroll/runs/1/status"} 1',
    );
  });

  it('skips writes when the database is unavailable', async () => {
    const query = jest.fn();
    const service = new AuditWriterService({
      configured: false,
      query,
    } as never);

    await service.appendEvent({ headers: {} } as never, 'READ', 'employee');

    expect(query).not.toHaveBeenCalled();
  });

  it('normalizes fallback request fields and forwarded headers', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new AuditWriterService({
      configured: true,
      query,
    } as never);

    await service.appendEvent(
      {
        requestId: undefined,
        method: 'GET',
        url: '/employees',
        ip: '10.0.0.2',
        tenantId: 'tenant-from-request',
        headers: {
          'user-agent': ['agent-array'],
          'x-forwarded-for': ['203.0.113.10, 10.0.0.2'],
        },
      } as never,
      'READ',
      'employee',
      {
        statusCode: 200,
      },
    );

    const values = query.mock.calls[0][1] as unknown[];
    const metadata = JSON.parse(values[8] as string) as Record<string, unknown>;
    expect(values.slice(0, 8)).toEqual([
      'READ',
      'employee',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(metadata).toMatchObject({
      method: 'GET',
      path: '/employees',
      statusCode: 200,
      tenantId: 'tenant-from-request',
      actorGroups: [],
      ipAddress: '203.0.113.10',
      userAgent: 'agent-array',
    });
    expect(values[10]).toBe('203.0.113.10');
    expect(values[11]).toBe('agent-array');
  });

  it('records international-transfer events from cross-border audit metadata', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new AuditWriterService({
      configured: true,
      query,
    } as never);

    await service.appendEvent(
      {
        requestId: 'req-transfer',
        method: 'POST',
        originalUrl: '/processor',
        ip: '127.0.0.1',
        headers: {},
        actor: {
          sub: 'sub-1',
          username: 'tester',
          tenantId: '00000000-0000-0000-0000-000000000100',
          groups: [],
          permissions: [],
        },
      } as never,
      'PROCESS',
      'processor_call',
      {
        resourceId: 'call-1',
        metadata: {
          flowKey: 'payroll.payslip_pdf',
          processorName: 'EU Cloud Processor',
          destinationCountry: 'EU',
          dataCategories: ['payroll'],
        },
      },
    );

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain(
      'INSERT INTO lgpd.international_transfer_event',
    );
    expect(query.mock.calls[1][1]).toEqual(
      expect.arrayContaining([
        'payroll.payslip_pdf',
        'EU Cloud Processor',
        'EU',
      ]),
    );
  });
});
