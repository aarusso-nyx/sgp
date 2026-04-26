import { Injectable } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service';
import { AuditEventQueryDto } from '../../audit/audit.dto';
import { AuditEventDto } from '../../audit/audit-query.service';
import { PagedResponse } from '../../common/pagination/paged-response';

@Injectable()
export class AuditSearchService {
  constructor(private readonly auditService: AuditService) {}

  search(query: AuditEventQueryDto): Promise<PagedResponse<AuditEventDto>> {
    return this.auditService.list(query);
  }
}
