import { NotFoundException } from '@nestjs/common';

import { LaiRequestsService } from './lai-requests.service';
import { LaiSlaService } from './lai-sla.service';

describe('LaiRequestsService', () => {
  it('creates a request through the canonical SQL function', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        protocol: 'LAI-20260502-000001',
        access_key: 'access-key',
        status: 'RECEIVED',
        submitted_at: '2026-05-02T10:00:00.000Z',
        due_at: '2026-05-22T10:00:00.000Z',
      },
    ]);
    const service = new LaiRequestsService(
      { configured: true, query } as never,
      new LaiSlaService(),
    );

    await expect(
      service.create('00000000-0000-4000-8000-000000000001', {
        requesterName: 'Ana Silva',
        requesterEmail: 'ana@example.gov.br',
        requestText: 'Solicito informacoes sobre despesas de pessoal.',
      }),
    ).resolves.toMatchObject({
      protocol: 'LAI-20260502-000001',
      accessKey: 'access-key',
      status: 'RECEIVED',
      dueAt: '2026-05-22T10:00:00.000Z',
    });
    expect(query.mock.calls[0][0]).toContain('create_lai_request');
    expect(query.mock.calls[0][1]).toEqual([
      '00000000-0000-4000-8000-000000000001',
      'Ana Silva',
      'ana@example.gov.br',
      'Solicito informacoes sobre despesas de pessoal.',
      null,
    ]);
  });

  it('returns public status without exposing request text or requester data', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        protocol: 'LAI-20260502-000001',
        status: 'EXTENDED',
        submitted_at: '2026-05-02T10:00:00.000Z',
        due_at: '2026-05-22T10:00:00.000Z',
        extended_due_at: '2026-06-01T10:00:00.000Z',
        answered_at: null,
        closed_at: null,
      },
    ]);
    const service = new LaiRequestsService(
      { configured: true, query } as never,
      new LaiSlaService(),
    );

    const result = await service.status(
      '00000000-0000-4000-8000-000000000001',
      'LAI-20260502-000001',
      'access-key',
    );

    expect(result).toMatchObject({
      protocol: 'LAI-20260502-000001',
      status: 'EXTENDED',
      extendedDueAt: '2026-06-01T10:00:00.000Z',
    });
    expect(JSON.stringify(result)).not.toMatch(/requester|requestText|email/i);
  });

  it('maps an unknown protocol or access key to not found', async () => {
    const service = new LaiRequestsService(
      { configured: true, query: jest.fn().mockResolvedValueOnce([]) } as never,
      new LaiSlaService(),
    );

    await expect(
      service.status(
        '00000000-0000-4000-8000-000000000001',
        'LAI-20260502-000404',
        'bad-key',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
