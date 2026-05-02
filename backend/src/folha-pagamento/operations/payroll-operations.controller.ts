import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
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
@Controller('v1/folha')
export class PayrollOperationsController {
  constructor(
    private readonly payrollOperationsService: PayrollOperationsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('remessa')
  @RequirePermission('payment.remittance.read')
  @ApiOkResponse({
    description: 'List remittance files by competence.',
  })
  listRemittancesByCompetence(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
    @Query() query: DomainListQueryDto,
  ) {
    return this.payrollOperationsService.listRemittancesByCompetence(
      year,
      month,
      query,
    );
  }

  @Get(':id/remessa')
  @RequirePermission('payment.remittance.read')
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
  @RequirePermission('payment.remittance.write')
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
    await this.auditService.auditMutation(request, 'CREATE', 'report_request', {
      resourceId: created.requestId,
      tableName: 'report_request',
      metadata: {
        operation: 'remessa.gerar',
        payrollRunId,
        ...created.metadata,
      },
    });
    return created;
  }

  @Post(':id/retorno')
  @RequirePermission('folha.write')
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
    await this.auditService.auditMutation(
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
@Controller('v1/gfip')
export class PayrollGfipController {
  constructor(
    private readonly payrollOperationsService: PayrollOperationsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('gerar')
  @RequirePermission('folha.write')
  @ApiCreatedResponse({
    description: 'Queue a GFIP/SEFIP generation request.',
  })
  async requestGfipGeneration(
    @Req() request: RequestWithContext,
    @Body() body: CreateGfipRequestDto,
  ) {
    const created =
      await this.payrollOperationsService.requestGfipGeneration(body);
    await this.auditService.auditMutation(request, 'CREATE', 'report_request', {
      resourceId: created.requestId,
      tableName: 'report_request',
      metadata: {
        operation: 'gfip.gerada',
        ...created.metadata,
      },
    });
    return created;
  }
}
