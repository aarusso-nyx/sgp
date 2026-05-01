import { HistoryService } from './history.service';

describe('HistoryService', () => {
  it('returns immutable career history ordered by the view query', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        event_id: 'event-1',
        event_type: 'functional_status',
        event_date: '2026-05-01',
        ends_on: null,
        title: 'Ativo',
        notes: 'Admissao',
        metadata: { functionalStatusId: 'status-1' },
      },
    ]);
    const service = new HistoryService({ configured: true, query } as never);

    await expect(
      service.listEmployeeHistory('emp-1', { type: 'functional_status' }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'event-1',
        type: 'functional_status',
        date: '2026-05-01',
      }),
    ]);
    expect(query.mock.calls[0]?.[0]).toContain(
      'FROM hr.v_employee_career_history',
    );
    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY event_date DESC');
  });
});
