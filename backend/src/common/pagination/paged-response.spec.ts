import {
  createPagedResponse,
  paginateItems,
  resolvePagination,
} from './paged-response';

describe('pagination helpers', () => {
  it('applies page defaults and calculates offset', () => {
    expect(resolvePagination({})).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
    });
    expect(resolvePagination({ page: 3, pageSize: 50 })).toEqual({
      page: 3,
      pageSize: 50,
      offset: 100,
    });
  });

  it('rejects invalid pagination boundaries', () => {
    expect(() => resolvePagination({ page: 0, pageSize: 20 })).toThrow(
      'page must be a positive integer',
    );
    expect(() => resolvePagination({ page: 1, pageSize: 0 })).toThrow(
      'pageSize must be a positive integer',
    );
    expect(() => resolvePagination({ page: 1.5, pageSize: 20 })).toThrow(
      'page must be a positive integer',
    );
    expect(() => resolvePagination({ page: 1, pageSize: 101 })).toThrow(
      'pageSize must not be greater than 100',
    );
  });

  it('builds the stable paged response envelope', () => {
    const response = createPagedResponse(['a', 'b'], 101, {
      page: 3,
      pageSize: 50,
    });

    expect(Object.keys(response)).toEqual([
      'items',
      'page',
      'pageSize',
      'total',
      'totalPages',
    ]);
    expect(response).toEqual({
      items: ['a', 'b'],
      page: 3,
      pageSize: 50,
      total: 101,
      totalPages: 3,
    });
  });

  it('keeps in-memory pagination aligned with the shared window', () => {
    expect(paginateItems([1, 2, 3, 4, 5], { page: 2, pageSize: 2 })).toEqual({
      items: [3, 4],
      page: 2,
      pageSize: 2,
      total: 5,
      totalPages: 3,
    });
  });
});
