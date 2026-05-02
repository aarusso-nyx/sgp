import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BiometriaController } from './biometria.controller';
import { BiometricCaptureService } from './biometric-capture.service';
import { BiometricMatcherService } from './biometric-matcher.service';
import { BiometricConsentService } from './consent.service';
import { BiometricRetentionScheduler } from './retention.scheduler';

@Module({
  imports: [DatabaseModule],
  controllers: [BiometriaController],
  providers: [
    BiometricConsentService,
    BiometricCaptureService,
    BiometricMatcherService,
    BiometricRetentionScheduler,
  ],
  exports: [
    BiometricConsentService,
    BiometricCaptureService,
    BiometricMatcherService,
    BiometricRetentionScheduler,
  ],
})
export class BiometriaModule {}
