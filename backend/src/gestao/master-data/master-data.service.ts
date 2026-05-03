import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { MasterDataMutationDto } from './master-data.dto';
import { RESOURCES } from './master-data.catalog';
import {
  createMasterDataResourceServices,
  MasterDataResourceService,
} from './master-data.resource-service';
import { MasterDataRecord, MasterDataResource } from './master-data.types';

export type {
  MasterDataColumn,
  MasterDataField,
  MasterDataRecord,
  MasterDataResource,
} from './master-data.types';

@Injectable()
export class MasterDataService {
  private readonly resourceServices: Record<string, MasterDataResourceService>;

  constructor(database: DatabaseService) {
    this.resourceServices = createMasterDataResourceServices(database);
  }

  listResources(query: DomainListQueryDto): PagedResponse<MasterDataResource> {
    const filtered = this.filter(RESOURCES, query.search);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  async listRecords(
    resource: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<MasterDataRecord>> {
    return this.requireResourceService(resource).listRecords(query);
  }

  async createRecord(
    resource: string,
    input: MasterDataMutationDto,
  ): Promise<MasterDataRecord> {
    return this.requireResourceService(resource).createRecord(input);
  }

  async updateRecord(
    resource: string,
    id: string,
    input: MasterDataMutationDto,
  ): Promise<MasterDataRecord> {
    return this.requireResourceService(resource).updateRecord(id, input);
  }

  async deactivateRecord(
    resource: string,
    id: string,
  ): Promise<MasterDataRecord> {
    return this.requireResourceService(resource).deactivateRecord(id);
  }

  private requireResource(resource: string): MasterDataResource {
    const found = RESOURCES.find((item) => item.key === resource);
    if (!found) {
      throw new NotFoundException(
        `Master data resource not found: ${resource}`,
      );
    }
    return found;
  }

  private requireResourceService(resource: string): MasterDataResourceService {
    this.requireResource(resource);
    const service = this.resourceServices[resource];
    if (!service) {
      throw new NotImplementedException(
        `PostgreSQL mapping not implemented for master-data resource: ${resource}`,
      );
    }
    return service;
  }

  private filter<T>(items: T[], search?: string): T[] {
    if (!search) return items;
    const needle = search.toLowerCase();
    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(needle),
    );
  }
}
