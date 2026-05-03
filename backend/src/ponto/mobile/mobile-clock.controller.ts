import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  CreateMobileGeolocationConsentDto,
  MobileClockInDto,
  RegisterMobileDeviceDto,
  UpdateWorkLocationGeofenceDto,
} from './mobile-clock.dto';
import { MobileClockService } from './mobile-clock.service';

@ApiTags('ponto-mobile')
@ApiBearerAuth()
@Controller('v1/ponto/mobile')
export class MobileClockController {
  constructor(private readonly mobileClockService: MobileClockService) {}

  @ApiOperation({ summary: 'POST devices' })
  @Post('devices')
  @RequirePermission('ponto.mobile.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.mobile_device_registration',
    tableName: 'ponto.mobile_device_registration',
  })
  @ApiCreatedResponse({ description: 'Register a mobile device public key.' })
  registerDevice(@Body() body: RegisterMobileDeviceDto) {
    return this.mobileClockService.registerDevice(body);
  }

  @ApiOperation({ summary: 'POST consents' })
  @Post('consents')
  @RequirePermission('ponto.mobile.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.mobile_geolocation_consent',
    tableName: 'ponto.mobile_geolocation_consent',
  })
  @ApiCreatedResponse({ description: 'Register LGPD geolocation consent.' })
  createConsent(@Body() body: CreateMobileGeolocationConsentDto) {
    return this.mobileClockService.createConsent(body);
  }

  @ApiOperation({ summary: 'POST clock' })
  @Post('clock')
  @RequirePermission('ponto.mobile.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.mobile_clock_in_attempt',
    tableName: 'ponto.mobile_clock_in_attempt',
  })
  @ApiCreatedResponse({ description: 'Submit geofenced mobile clock-in.' })
  clock(@Body() body: MobileClockInDto) {
    return this.mobileClockService.clock(body);
  }

  @ApiOperation({ summary: 'POST geofences' })
  @Post('geofences')
  @RequirePermission('ponto.mobile.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.work_location',
    tableName: 'hr.work_location',
  })
  @ApiCreatedResponse({
    description: 'Update a work-location geofence polygon.',
  })
  updateGeofence(@Body() body: UpdateWorkLocationGeofenceDto) {
    return this.mobileClockService.updateGeofence(body);
  }
}
