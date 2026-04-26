import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { CognitoJwtGuard } from '../../auth/cognito-jwt.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import {
  CreateGfipRequestDto,
  CreateRemittanceRequestDto,
  ProcessReturnRequestDto,
} from './payroll-operations.dto';
import { PayrollOperationsService } from './payroll-operations.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/folha')
export class PayrollOperationsController {
  constructor(
    private readonly payrollOperationsService: PayrollOperationsService,
    private readonly auditService: AuditService,
  ) {}

  @Get(':id/remessa')
  @RequirePermissions('folha:read')
  @ApiOkResponse({
    description: 'List remittance requests for one payroll run.',
  })
  listRemittances(
    @Param('id') payrollRunId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.payrollOperationsService.listRemittances(payrollRunId, query);
  }

  @Post(':id/remessa')
  @RequirePermissions('folha:write')
  @ApiCreatedResponse({
    description: 'Queue a CNAB remittance generation request.',
  })
  async requestRemittance(
    @Req() request: RequestWithContext,
    @Param('id') payrollRunId: string,
    @Body() body: CreateRemittanceRequestDto,
  ) {
    const created = await this.payrollOperationsService.requestRemittance(
      payrollRunId,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'report_request',
      {
        resourceId: created.requestId,
        tableName: 'report_request',
        metadata: {
          operation: 'remessa.gerar',
          payrollRunId,
          ...created.metadata,
        },
      },
    );
    return created;
  }

  @Post(':id/retorno')
  @RequirePermissions('folha:write')
  @ApiCreatedResponse({
    description: 'Queue a CNAB return processing request for one payroll run.',
  })
  async requestReturnProcessing(
    @Req() request: RequestWithContext,
    @Param('id') payrollRunId: string,
    @Body() body: ProcessReturnRequestDto,
  ) {
    const created = await this.payrollOperationsService.requestReturnProcessing(
      payrollRunId,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'PROCESS',
      'report_request',
      {
        resourceId: created.requestId,
        tableName: 'report_request',
        metadata: {
          operation: 'retorno.processar',
          payrollRunId,
          ...created.metadata,
        },
      },
    );
    return created;
  }
}

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/gfip')
export class PayrollGfipController {
  constructor(
    private readonly payrollOperationsService: PayrollOperationsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('gerar')
  @RequirePermissions('folha:write')
  @ApiCreatedResponse({
    description: 'Queue a GFIP/SEFIP generation request.',
  })
  async requestGfipGeneration(
    @Req() request: RequestWithContext,
    @Body() body: CreateGfipRequestDto,
  ) {
    const created =
      await this.payrollOperationsService.requestGfipGeneration(body);
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'report_request',
      {
        resourceId: created.requestId,
        tableName: 'report_request',
        metadata: {
          operation: 'gfip.gerada',
          ...created.metadata,
        },
      },
    );
    return created;
  }
}
