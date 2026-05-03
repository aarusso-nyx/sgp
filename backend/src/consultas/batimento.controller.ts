import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { BatimentoService } from './batimento.service';
import { BatimentoQueryDto } from './consultas.dto';

@ApiTags('consultas')
@ApiBearerAuth()
@Controller('v1/consultas/batimento')
export class BatimentoController {
  constructor(private readonly batimentoService: BatimentoService) {}

  @ApiOperation({ summary: 'GET Create report' })
  @Get()
  @RequirePermission(['consultas.read', 'relatorio.generate'])
  @ApiOkResponse({
    description:
      'Create a folha batimento report request and return reconciliation assertions.',
  })
  createReport(@Query() query: BatimentoQueryDto) {
    return this.batimentoService.createReport(query);
  }
}
