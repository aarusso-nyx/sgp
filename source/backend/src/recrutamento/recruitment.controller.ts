import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import {
  AttachRecruitmentCandidatesDto,
  CreateRecruitmentRequestDto,
  UpdateRecruitmentCandidateDto,
} from './recruitment.dto';
import { RecruitmentService } from './recruitment.service';

@ApiTags('recrutamento')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/recrutamento')
export class RecruitmentController {
  constructor(
    private readonly recruitmentService: RecruitmentService,
    private readonly auditService: AuditService,
  ) {}

  @Post('requisicoes')
  @RequirePermissions('recrutamento:write')
  @ApiCreatedResponse({ description: 'Create a recruitment request.' })
  async createRequest(
    @Req() request: RequestWithContext,
    @Body() body: CreateRecruitmentRequestDto,
  ) {
    const created = await this.recruitmentService.createRequest(body);
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'recruitment_request',
      {
        resourceId: created.id,
        tableName: 'recruitment_request',
      },
    );
    return created;
  }

  @Patch('requisicoes/:requisicao_id/encaminhar')
  @RequirePermissions('recrutamento:write')
  @ApiOkResponse({ description: 'Forward a recruitment request to RH.' })
  async forwardRequest(
    @Req() request: RequestWithContext,
    @Param('requisicao_id') requestId: string,
  ) {
    const updated = await this.recruitmentService.forwardRequest(
      requestId,
      request.actor?.username,
    );
    await this.auditService.appendMutation(
      request,
      'PROCESS',
      'recruitment_request',
      {
        resourceId: updated.id,
        tableName: 'recruitment_request',
        metadata: { transition: 'encaminhar' },
      },
    );
    return updated;
  }

  @Post('requisicoes/:requisicao_id/candidatos')
  @RequirePermissions('recrutamento:write')
  @ApiCreatedResponse({
    description: 'Attach candidates to a recruitment request.',
  })
  async attachCandidates(
    @Req() request: RequestWithContext,
    @Param('requisicao_id') requestId: string,
    @Body() body: AttachRecruitmentCandidatesDto,
  ) {
    const created = await this.recruitmentService.attachCandidates(
      requestId,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'recruitment_candidate',
      {
        resourceId: requestId,
        tableName: 'recruitment_candidate',
        metadata: { count: created.candidatos.length },
      },
    );
    return created;
  }

  @Patch('candidatos/:candidato_id')
  @RequirePermissions('recrutamento:write')
  @ApiOkResponse({ description: 'Update recruitment candidate analysis.' })
  async updateCandidate(
    @Req() request: RequestWithContext,
    @Param('candidato_id') candidateId: string,
    @Body() body: UpdateRecruitmentCandidateDto,
  ) {
    const updated = await this.recruitmentService.updateCandidate(
      candidateId,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'UPDATE',
      'recruitment_candidate',
      {
        resourceId: updated.id,
        tableName: 'recruitment_candidate',
      },
    );
    return updated;
  }

  @Patch('requisicoes/:requisicao_id/concluir')
  @RequirePermissions('recrutamento:write')
  @ApiOkResponse({ description: 'Conclude recruitment analysis.' })
  async concludeRequest(
    @Req() request: RequestWithContext,
    @Param('requisicao_id') requestId: string,
  ) {
    const updated = await this.recruitmentService.concludeRequest(requestId);
    await this.auditService.appendMutation(
      request,
      'PROCESS',
      'recruitment_request',
      {
        resourceId: updated.id,
        tableName: 'recruitment_request',
        metadata: { transition: 'concluir' },
      },
    );
    return updated;
  }
}
