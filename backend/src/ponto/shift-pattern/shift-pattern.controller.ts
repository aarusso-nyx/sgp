import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  AssignShiftPatternDto,
  CreateShiftPatternDto,
  UpdateShiftAssignmentDto,
} from '../ponto.dto';
import { ShiftPatternService } from './shift-pattern.service';

@ApiTags('ponto-shift-pattern')
@ApiBearerAuth()
@Controller('v1/ponto/escalas')
export class ShiftPatternController {
  constructor(private readonly shiftPatternService: ShiftPatternService) {}

  @ApiOperation({ summary: 'GET padroes' })
  @Get('padroes')
  @RequirePermission('ponto.roster.read')
  @ApiOkResponse({ description: 'Shift patterns with cycle preview.' })
  listPatterns() {
    return this.shiftPatternService.list();
  }

  @ApiOperation({ summary: 'POST padroes' })
  @Post('padroes')
  @RequirePermission('ponto.roster.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.shift_pattern',
    tableName: 'ponto.shift_pattern',
  })
  @ApiCreatedResponse({ description: 'Create a cyclic shift pattern.' })
  createPattern(@Body() body: CreateShiftPatternDto) {
    return this.shiftPatternService.create(body);
  }

  @ApiOperation({ summary: 'GET atribuicoes' })
  @Get('atribuicoes')
  @RequirePermission('ponto.roster.read')
  @ApiOkResponse({ description: 'Shift assignments.' })
  listAssignments(@Query('employeeId') employeeId?: string) {
    return this.shiftPatternService.listAssignments(employeeId);
  }

  @ApiOperation({ summary: 'POST atribuicoes' })
  @Post('atribuicoes')
  @RequirePermission('ponto.roster.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.shift_assignment',
    tableName: 'ponto.shift_assignment',
  })
  @ApiCreatedResponse({ description: 'Assign a shift pattern to an employee.' })
  assign(@Body() body: AssignShiftPatternDto) {
    return this.shiftPatternService.assign(body);
  }

  @ApiOperation({ summary: 'PATCH atribuicoes/:shiftAssignmentId' })
  @Patch('atribuicoes/:shiftAssignmentId')
  @RequirePermission('ponto.roster.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'ponto.shift_assignment',
    tableName: 'ponto.shift_assignment',
  })
  @ApiOkResponse({ description: 'Update a shift assignment.' })
  updateAssignment(
    @Param('shiftAssignmentId') shiftAssignmentId: string,
    @Body() body: UpdateShiftAssignmentDto,
  ) {
    return this.shiftPatternService.updateAssignment(shiftAssignmentId, body);
  }
}
