import { NotFoundException } from '@nestjs/common';

import { EvaluationReportService } from './evaluation-report.service';

describe('EvaluationReportService', () => {
  const requestRow = {
    id: 'request-1',
    status: 'REQUESTED',
    requested_at: '2026-05-01T10:00:00.000Z',
  };

  const createData = () => ({
    ensureDatabase: jest.fn(),
    query: jest.fn(async (sql: string) => {
      if (sql.includes('SELECT 1 FROM hr.performance_evaluation')) {
        return [{}];
      }
      if (sql.includes('public.report_definition')) {
        return [{ id: 'definition-1' }];
      }
      if (sql.includes('public.report_request')) {
        return [requestRow];
      }
      return [];
    }),
    toIso: (value: Date | string) => new Date(value).toISOString(),
  });

  it('queues performance sheet and cycle report requests', async () => {
    const data = createData();
    const service = new EvaluationReportService(data as never);

    await expect(
      service.requestEvaluationSheet('aval-1', { formato: 'PDF' }),
    ).resolves.toEqual({
      id: 'request-1',
      status: 'REQUESTED',
      requestedAt: '2026-05-01T10:00:00.000Z',
    });
    await expect(
      service.requestCycleReport('2026', { lotacaoId: 'lot-1' }),
    ).resolves.toHaveProperty('id', 'request-1');

    expect(data.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.report_request'),
      expect.arrayContaining(['definition-1', expect.stringContaining('PDF')]),
    );
  });

  it('rejects evaluation sheet requests for missing evaluations', async () => {
    const data = createData();
    data.query.mockResolvedValueOnce([]);
    const service = new EvaluationReportService(data as never);

    await expect(
      service.requestEvaluationSheet('missing', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
