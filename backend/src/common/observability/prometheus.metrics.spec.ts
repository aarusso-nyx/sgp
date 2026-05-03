import {
  configurePrometheusMetricsEntrypoint,
  auditEventsEmittedTotal,
  dctfwebTransmissionsTotal,
  esocialSubmissionsTotal,
  prometheusRegistry,
  queueDepth,
  recordAuditEvent,
  recordDctfwebTransmission,
  recordEsocialSubmission,
  recordQueueDepth,
  recordWorkerActiveClaims,
  workerActiveClaims,
} from './prometheus.metrics';

describe('Prometheus metrics registry', () => {
  it('registers the Wave 7 observability metrics', () => {
    expect(prometheusRegistry.metricNames()).toEqual(
      expect.arrayContaining([
        'sgp_http_request_duration_seconds',
        'sgp_http_requests_total',
        'sgp_queue_depth',
        'sgp_worker_active_claims',
        'sgp_audit_events_emitted_total',
        'sgp_esocial_submissions_total',
        'sgp_dctfweb_transmissions_total',
      ]),
    );
    expect(queueDepth.type).toBe('gauge');
    expect(workerActiveClaims.type).toBe('gauge');
    expect(auditEventsEmittedTotal.type).toBe('counter');
    expect(esocialSubmissionsTotal.type).toBe('counter');
    expect(dctfwebTransmissionsTotal.type).toBe('counter');
  });

  it('exports Prometheus text for domain metric extension points', () => {
    recordQueueDepth('esocial-submissions', 7);
    recordWorkerActiveClaims('sgp-esocial-worker', 2);
    recordAuditEvent('PayrollController', '/api/payroll/runs/:id');
    recordEsocialSubmission('accepted', 'S-1200');
    recordDctfwebTransmission('sent');

    const metrics = prometheusRegistry.collect();

    expect(metrics).toContain('sgp_queue_depth{queue="esocial-submissions"} 7');
    expect(metrics).toContain(
      'sgp_worker_active_claims{worker="sgp-esocial-worker"} 2',
    );
    expect(metrics).toContain(
      'sgp_audit_events_emitted_total{controller="PayrollController",route="/api/payroll/runs/:id"} 1',
    );
    expect(metrics).toContain(
      'sgp_esocial_submissions_total{event_type="S-1200",status="accepted"} 1',
    );
    expect(metrics).toContain(
      'sgp_dctfweb_transmissions_total{status="sent"} 1',
    );
  });

  it('mounts /metrics on an HTTP entrypoint', () => {
    const get = jest.fn();
    const app = {
      use: jest.fn(),
      getHttpAdapter: () => ({
        getInstance: () => ({ get }),
      }),
    };

    configurePrometheusMetricsEntrypoint(app as never, 'sgp-core-api');

    expect(app.use).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/metrics', expect.any(Function));
  });
});
