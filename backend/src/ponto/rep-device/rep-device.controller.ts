import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CreateRepDeviceDto } from '../ponto.dto';
import { RepDeviceService } from './rep-device.service';

@ApiTags('ponto-rep-device')
@ApiBearerAuth()
@Controller('v1/ponto/rep')
export class RepDeviceController {
  constructor(private readonly repDeviceService: RepDeviceService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('ponto.rep.read')
  @ApiOkResponse({ description: 'REP devices.' })
  list() {
    return this.repDeviceService.list();
  }

  @ApiOperation({ summary: 'GET :repDeviceId' })
  @Get(':repDeviceId')
  @RequirePermission('ponto.rep.read')
  @ApiOkResponse({ description: 'REP device detail.' })
  get(@Param('repDeviceId') repDeviceId: string) {
    return this.repDeviceService.get(repDeviceId);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('ponto.rep.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.rep_device',
    tableName: 'ponto.rep_device',
  })
  @ApiCreatedResponse({ description: 'Create REP device.' })
  create(@Body() body: CreateRepDeviceDto) {
    return this.repDeviceService.create(body);
  }
}
