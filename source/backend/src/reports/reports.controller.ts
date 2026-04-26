import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}
}
