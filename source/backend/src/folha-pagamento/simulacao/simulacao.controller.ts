import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RunPayrollSimulationDto } from './simulacao.dto';
import { SimulacaoService } from './simulacao.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@Controller('v1/folha/simulacao')
export class SimulacaoController {
  constructor(
    private readonly simulacaoService: SimulacaoService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequirePermission('payroll.simulation.execute')
  @ApiOkResponse({ description: 'Run a dry-run payroll simulation.' })
  async run(
    @Req() request: RequestWithContext,
    @Body() body: RunPayrollSimulationDto,
  ) {
    const result = await this.simulacaoService.run(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'payroll_simulation',
      {
        resourceId: body.employmentLinkId,
        metadata: {
          competence: body.competence,
          lineCount: result.lines.length,
          netDelta: result.totals.netDelta,
        },
      },
    );
    return result;
  }
}
