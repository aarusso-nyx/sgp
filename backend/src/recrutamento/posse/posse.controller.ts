import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { AgendarPosseDto, CancelarPosseDto } from './posse.dto';
import { PosseService } from './posse.service';

@ApiTags('recrutamento-posse')
@ApiBearerAuth()
@Controller('v1/admin/posses')
export class PosseController {
  constructor(private readonly posseService: PosseService) {}

  @ApiOperation({ summary: 'POST Agendar' })
  @Post()
  @RequirePermission(['recrutamento.posse.write', 'rh.employee.write'])
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.posse',
    tableName: 'recrutamento.posse',
  })
  @ApiCreatedResponse({ description: 'Schedule candidate possession.' })
  agendar(@Body() body: AgendarPosseDto) {
    return this.posseService.agendar(
      body.nomeacaoId,
      body.posseAt,
      body.lotacaoId,
    );
  }

  @ApiOperation({ summary: 'PATCH :id/realizar-posse' })
  @Patch(':id/realizar-posse')
  @RequirePermission(['recrutamento.posse.write', 'rh.employee.write'])
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.posse',
    tableName: 'recrutamento.posse',
  })
  @ApiOkResponse({ description: 'Mark possession as completed.' })
  realizarPosse(@Param('id') id: string) {
    return this.posseService.realizarPosse(id);
  }

  @ApiOperation({ summary: 'PATCH :id/iniciar-exercicio' })
  @Patch(':id/iniciar-exercicio')
  @RequirePermission(['recrutamento.posse.write', 'rh.employee.write'])
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.posse.exercicio',
    tableName: 'recrutamento.posse',
  })
  @ApiOkResponse({ description: 'Create active employee and dispatch S-2200.' })
  iniciarExercicio(@Param('id') id: string) {
    return this.posseService.iniciarExercicio(id);
  }

  @ApiOperation({ summary: 'PATCH :id/prorrogar-exercicio' })
  @Patch(':id/prorrogar-exercicio')
  @RequirePermission(['recrutamento.posse.write', 'rh.employee.write'])
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'recrutamento.posse',
    tableName: 'recrutamento.posse',
  })
  @ApiOkResponse({
    description: 'Prorogue exercise deadline by 15 business days.',
  })
  prorrogar(@Param('id') id: string) {
    return this.posseService.prorrogarExercicio(id);
  }

  @ApiOperation({ summary: 'PATCH :id/cancelar' })
  @Patch(':id/cancelar')
  @RequirePermission(['recrutamento.posse.write', 'rh.employee.write'])
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'recrutamento.posse',
    tableName: 'recrutamento.posse',
  })
  @ApiOkResponse({ description: 'Cancel possession before employee creation.' })
  cancelar(@Param('id') id: string, @Body() body: CancelarPosseDto) {
    return this.posseService.cancelar(id, body.reason);
  }
}
