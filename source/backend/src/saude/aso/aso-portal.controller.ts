import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { AsoService } from './aso.service';

@ApiTags('portal-aso')
@ApiBearerAuth()
@Controller('v1/portal/aso')
export class AsoPortalController {
  constructor(private readonly asoService: AsoService) {}

  @Get()
  @RequirePermission('saude.aso.self_read')
  @ApiOkResponse({
    description: 'Own ASO records with clinical content masked.',
  })
  async listOwnAso() {
    const records = await this.asoService.listAsoRecords();
    return records.map((record) => ({
      id: record.id,
      asoKind: record.asoKind,
      scheduledAt: record.scheduledAt,
      performedAt: record.performedAt,
      conclusion: record.conclusion,
      nextExamDueAt: record.nextExamDueAt,
      status: record.status,
    }));
  }

  @Get('proximo')
  @RequirePermission('saude.aso.self_read')
  @ApiOkResponse({ description: 'Own next ASO due date.' })
  async nextDue() {
    const records = await this.asoService.listAsoRecords();
    const next = records
      .filter((record) => record.nextExamDueAt)
      .sort((a, b) =>
        String(a.nextExamDueAt).localeCompare(String(b.nextExamDueAt)),
      )[0];
    return {
      nextExamDueAt: next?.nextExamDueAt ?? null,
      asoKind: next?.asoKind ?? null,
    };
  }
}
