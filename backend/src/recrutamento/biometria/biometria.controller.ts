import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
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
  CaptureBiometricDto,
  CreateBiometricConsentDto,
  MatchBiometricDto,
} from './biometria.dto';
import { BiometricCaptureService } from './biometric-capture.service';
import { BiometricConsentService } from './consent.service';
import { BiometricMatcherService } from './biometric-matcher.service';

@ApiTags('recrutamento-biometria')
@ApiBearerAuth()
@Controller('v1/recrutamento/biometria')
export class BiometriaController {
  constructor(
    private readonly consentService: BiometricConsentService,
    private readonly captureService: BiometricCaptureService,
    private readonly matcherService: BiometricMatcherService,
  ) {}

  @ApiOperation({ summary: 'POST consentimentos' })
  @Post('consentimentos')
  @RequirePermission('recrutamento.biometric.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.biometric_consent',
    tableName: 'recrutamento.biometric_consent',
  })
  @ApiCreatedResponse({
    description: 'Register highlighted LGPD art. 11 biometric consent.',
  })
  createConsent(@Body() body: CreateBiometricConsentDto) {
    return this.consentService.create(body);
  }

  @ApiOperation({ summary: 'POST capturas' })
  @Post('capturas')
  @RequirePermission('recrutamento.biometric.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.candidate_biometric',
    tableName: 'recrutamento.candidate_biometric',
  })
  @ApiCreatedResponse({
    description: 'Capture encrypted candidate biometric template.',
  })
  capture(@Body() body: CaptureBiometricDto) {
    return this.captureService.capture(body);
  }

  @ApiOperation({ summary: 'POST matching' })
  @Post('matching')
  @RequirePermission('recrutamento.biometric.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.biometric_match_attempt',
    tableName: 'recrutamento.biometric_match_attempt',
  })
  @ApiOkResponse({
    description: 'Match probe against active candidate biometrics.',
  })
  match(@Body() body: MatchBiometricDto) {
    return this.matcherService.match(body);
  }

  @ApiOperation({ summary: 'DELETE candidatos/:candidatoId' })
  @Delete('candidatos/:candidatoId')
  @RequirePermission('recrutamento.biometric.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'recrutamento.candidate_biometric',
    tableName: 'recrutamento.candidate_biometric',
  })
  @ApiOkResponse({
    description: 'Withdraw consent and crypto-shred candidate biometrics.',
  })
  withdraw(@Param('candidatoId') candidatoId: string) {
    return this.consentService.withdraw(candidatoId);
  }
}
