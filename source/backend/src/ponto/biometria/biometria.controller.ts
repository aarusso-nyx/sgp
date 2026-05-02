import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import {
  CreateBiometricConsentDto,
  EnrollBiometricTemplateDto,
  MatchBiometricTemplateDto,
} from './biometria.dto';
import { PontoBiometricMatcherService } from './biometric-matcher.service';
import { PontoBiometricConsentService } from './consent.service';
import { TemplateEnrollmentService } from './template-enrollment.service';

@ApiTags('ponto-biometria')
@ApiBearerAuth()
@Controller('v1/ponto/biometria')
export class PontoBiometriaController {
  constructor(
    private readonly enrollmentService: TemplateEnrollmentService,
    private readonly matcherService: PontoBiometricMatcherService,
    private readonly consentService: PontoBiometricConsentService,
  ) {}

  @Get('templates')
  @RequirePermission('ponto.biometric.read')
  @ApiOkResponse({ description: 'Employee biometric template metadata.' })
  listTemplates(@Query('employeeId') employeeId?: string) {
    return this.enrollmentService.list(employeeId);
  }

  @Post('consents')
  @RequirePermission('ponto.biometric.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.biometric_consent',
    tableName: 'ponto.biometric_consent',
  })
  @ApiCreatedResponse({
    description: 'Register LGPD art. 11 biometric consent.',
  })
  createConsent(@Body() body: CreateBiometricConsentDto) {
    return this.consentService.create(body);
  }

  @Delete('employees/:employeeId/consent')
  @RequirePermission('ponto.biometric.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'ponto.biometric_consent',
    tableName: 'ponto.biometric_consent',
  })
  @ApiOkResponse({
    description: 'Withdraw biometric consent and revoke templates.',
  })
  withdrawConsent(@Param('employeeId') employeeId: string) {
    return this.consentService.withdraw(employeeId);
  }

  @Post('templates')
  @RequirePermission('ponto.biometric.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.employee_biometric_template',
    tableName: 'ponto.employee_biometric_template',
  })
  @ApiCreatedResponse({
    description: 'Enroll encrypted employee biometric template.',
  })
  enroll(@Body() body: EnrollBiometricTemplateDto) {
    return this.enrollmentService.enroll(body);
  }

  @Post('matches')
  @RequirePermission('ponto.biometric.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.biometric_match',
    tableName: 'ponto.biometric_match',
  })
  @ApiCreatedResponse({
    description: 'Match a biometric probe against active templates.',
  })
  match(@Body() body: MatchBiometricTemplateDto) {
    return this.matcherService.match(body);
  }
}
