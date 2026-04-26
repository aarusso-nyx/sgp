import { AuditSearchService } from './audit-search.service';

describe('AuditSearchService', () => {
  it('delegates audit search to audit service', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const service = new AuditSearchService({ list } as never);

    const result = await service.search({ page: 1, pageSize: 20 });

    expect(list).toHaveBeenCalledWith(expect.any(Object));
    expect(result).toEqual({ items: [] });
  });
});
