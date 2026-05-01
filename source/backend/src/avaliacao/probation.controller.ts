import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { CreateProbationEvaluationDto } from './avaliacao.dto';
import { ProbationService } from './probation.service';

@ApiTags('avaliacao')
@ApiBearerAuth()
@Controller('v1/avaliacao/estagio-probatorio')
export class ProbationController {
  constructor(
    private readonly probationService: ProbationService,
    private readonly auditService: AuditService,
  ) {}

  @Get('a-vencer')
  @RequirePermission('avaliacao.read')
  @ApiOkResponse({
    description: 'List statutory employees close to 36 probation months.',
  })
  listDue(@Query('referenceDate') referenceDate?: string) {
    return this.probationService.listDueForCompletion(
      referenceDate ? new Date(`${referenceDate}T00:00:00Z`) : undefined,
    );
  }

  @Post()
  @RequirePermission('avaliacao.probation.write')
  @ApiCreatedResponse({ description: 'Register a probation evaluation.' })
  async create(
    @Req() request: RequestWithContext,
    @Body() body: CreateProbationEvaluationDto,
  ) {
    const created = await this.probationService.createEvaluation(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'probation_evaluation',
      {
        resourceId: created.id,
        tableName: 'probation_evaluation',
      },
    );
    return created;
  }
}
