import { PageQueryDto } from './pagination.dto';

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginateItems<T>(
  items: T[],
  query: PageQueryDto,
): PagedResponse<T> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages,
  };
}
