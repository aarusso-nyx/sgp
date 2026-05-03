import { BadRequestException } from '@nestjs/common';

import { PageQueryDto } from './pagination.dto';

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationWindow {
  page: number;
  pageSize: number;
  offset: number;
}

export interface PaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGE_SIZE = 100;

export function resolvePagination(
  query: Partial<Pick<PageQueryDto, 'page' | 'pageSize'>>,
  options: PaginationOptions = {},
): PaginationWindow {
  const defaultPage = options.defaultPage ?? DEFAULT_PAGE;
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = options.maxPageSize ?? DEFAULT_MAX_PAGE_SIZE;
  const page = query.page ?? defaultPage;
  const pageSize = query.pageSize ?? defaultPageSize;

  validatePositiveInteger('page', page);
  validatePositiveInteger('pageSize', pageSize);

  if (pageSize > maxPageSize) {
    throw new BadRequestException(
      `pageSize must not be greater than ${maxPageSize}`,
    );
  }

  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw new BadRequestException('pagination offset is too large');
  }

  return { page, pageSize, offset };
}

export function createPagedResponse<T>(
  items: T[],
  total: number,
  pagination: Pick<PaginationWindow, 'page' | 'pageSize'>,
): PagedResponse<T> {
  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.pageSize),
  };
}

export function paginateItems<T>(
  items: T[],
  query: Partial<Pick<PageQueryDto, 'page' | 'pageSize'>>,
): PagedResponse<T> {
  const pagination = resolvePagination(query);
  const total = items.length;

  return createPagedResponse(
    items.slice(pagination.offset, pagination.offset + pagination.pageSize),
    total,
    pagination,
  );
}

function validatePositiveInteger(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }
}
