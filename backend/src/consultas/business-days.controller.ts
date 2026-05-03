import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { BusinessDaysQueryDto } from './consultas.dto';
import { BusinessDaysService } from './business-days.service';

@ApiTags('consultas')
@ApiBearerAuth()
@Controller('v1/consultas/business-days')
export class BusinessDaysController {
  constructor(private readonly businessDaysService: BusinessDaysService) {}

  @ApiOperation({ summary: 'GET Get working days' })
  @Get()
  @RequirePermission('consultas.read')
  @ApiOkResponse({
    description: 'Return configured working days between two inclusive dates.',
  })
  getWorkingDays(@Query() query: BusinessDaysQueryDto) {
    return this.businessDaysService.getWorkingDays(query);
  }
}
