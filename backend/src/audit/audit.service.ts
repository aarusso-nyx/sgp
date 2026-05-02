import { Injectable } from '@nestjs/common';

import type { RequestWithContext } from '../common/request-id/request-with-context';
import {
  AuditActionValue,
  AuditEventQueryDto,
  AuditReportRequestDto,
} from './audit.dto';
import {
  AuditEventDto,
  AuditFacetDto,
  AuditQueryService,
  AuditReportRequestSummary,
} from './audit-query.service';
import { AuditAppendOptions, AuditWriterService } from './audit-writer.service';
import { PagedResponse } from '../common/pagination/paged-response';

@Injectable()
export class AuditService {
  constructor(
    private readonly queryService: AuditQueryService,
    private readonly writerService: AuditWriterService,
  ) {}

  list(query: AuditEventQueryDto): Promise<PagedResponse<AuditEventDto>> {
    return this.queryService.list(query);
  }

  getById(id: string): Promise<AuditEventDto | null> {
    return this.queryService.getById(id);
  }

  actionFacets(query: AuditEventQueryDto): Promise<AuditFacetDto[]> {
    return this.queryService.actionFacets(query);
  }

  tableFacets(query: AuditEventQueryDto): Promise<AuditFacetDto[]> {
    return this.queryService.tableFacets(query);
  }

  userFacets(query: AuditEventQueryDto): Promise<AuditFacetDto[]> {
    return this.queryService.userFacets(query);
  }

  createReportRequest(
    input: AuditReportRequestDto,
  ): Promise<AuditReportRequestSummary> {
    return this.queryService.createReportRequest(input);
  }

  getReportRequestStatus(
    id: string,
  ): Promise<AuditReportRequestSummary | null> {
    return this.queryService.getReportRequestStatus(id);
  }

  auditMutation(
    request: RequestWithContext,
    action: Extract<
      AuditActionValue,
      'CREATE' | 'UPDATE' | 'DELETE' | 'PROCESS' | 'GENERATE'
    >,
    resourceType: string,
    options?: AuditAppendOptions,
  ): Promise<void> {
    return this.writerService.auditMutation(
      request,
      action,
      resourceType,
      options,
    );
  }

  appendEvent(
    request: RequestWithContext,
    action: AuditActionValue,
    resourceType: string,
    options?: AuditAppendOptions,
  ): Promise<void> {
    return this.writerService.appendEvent(
      request,
      action,
      resourceType,
      options,
    );
  }
}
