import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { FaceConsentService } from './consent.service';
import {
  CreateFaceConsentDto,
  EnrollFaceTemplateDto,
  FaceClockInDto,
  MatchFaceDto,
  UpdateFaceThresholdDto,
} from './face.dto';
import { FaceEnrollmentService } from './face-enrollment.service';
import { FaceMatcherService } from './face-matcher.service';
import { FaceThresholdAdminService } from './threshold-admin.service';

@ApiTags('ponto-face')
@ApiBearerAuth()
@Controller('v1/ponto/face')
export class FaceController {
  constructor(
    private readonly enrollmentService: FaceEnrollmentService,
    private readonly matcherService: FaceMatcherService,
    private readonly consentService: FaceConsentService,
    private readonly thresholdService: FaceThresholdAdminService,
  ) {}

  @Get('templates')
  @RequirePermission('ponto.face.read')
  @ApiOkResponse({ description: 'Employee face template metadata.' })
  listTemplates(@Query('employeeId') employeeId?: string) {
    return this.enrollmentService.list(employeeId);
  }

  @Post('consents')
  @RequirePermission('ponto.face.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.face_consent',
    tableName: 'ponto.face_consent',
  })
  @ApiCreatedResponse({
    description: 'Register highlighted LGPD art. 11 face consent.',
  })
  createConsent(@Body() body: CreateFaceConsentDto) {
    return this.consentService.create(body);
  }

  @Get('employees/:employeeId/status')
  @RequirePermission('ponto.face.read')
  @ApiOkResponse({
    description: 'Face recognition status visible in meus-dados.',
  })
  status(@Param('employeeId') employeeId: string) {
    return this.consentService.status(employeeId);
  }

  @Delete('employees/:employeeId/consent')
  @RequirePermission('ponto.face.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'ponto.employee_face_template',
    tableName: 'ponto.employee_face_template',
  })
  @ApiOkResponse({
    description: 'Withdraw face consent and crypto-shred embeddings.',
  })
  withdraw(@Param('employeeId') employeeId: string) {
    return this.consentService.withdraw(employeeId);
  }

  @Post('templates')
  @RequirePermission('ponto.face.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.employee_face_template',
    tableName: 'ponto.employee_face_template',
  })
  @ApiCreatedResponse({ description: 'Enroll encrypted local face embedding.' })
  enroll(@Body() body: EnrollFaceTemplateDto) {
    return this.enrollmentService.enroll(body);
  }

  @Post('matches')
  @RequirePermission('ponto.face.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.face_match',
    tableName: 'ponto.face_match',
  })
  @ApiCreatedResponse({
    description: 'Match a local face probe against active template.',
  })
  match(@Body() body: MatchFaceDto) {
    return this.matcherService.match(body);
  }

  @Post('clock')
  @RequirePermission('ponto.face.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.face_match',
    tableName: 'ponto.face_match',
  })
  @ApiCreatedResponse({
    description: 'Create a REP-A time record after accepted face match.',
  })
  clock(@Body() body: FaceClockInDto) {
    return this.matcherService.clock(body);
  }

  @Get('threshold')
  @RequirePermission('ponto.face.read')
  @ApiOkResponse({
    description: 'Current tenant face threshold configuration.',
  })
  threshold() {
    return this.thresholdService.getCurrent();
  }

  @Put('threshold')
  @RequirePermission('ponto.face.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'ponto.face_threshold_config',
    tableName: 'ponto.face_threshold_config',
  })
  @ApiOkResponse({
    description: 'Update tenant face threshold and liveness requirement.',
  })
  updateThreshold(@Body() body: UpdateFaceThresholdDto) {
    return this.thresholdService.update(body);
  }
}
