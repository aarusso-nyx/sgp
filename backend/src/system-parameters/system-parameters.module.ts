import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminMenusController } from './admin-menus.controller';
import { AdminMenusService } from './admin-menus.service';
import { AdminPlatformController } from './admin-platform.controller';
import { AdminPlatformService } from './admin-platform.service';
import { DatabaseModule } from '../database/database.module';
import {
  FeatureFlagsController,
  SystemParametersController,
} from './system-parameters.controller';
import { EsocialQueueTransportFlag } from './esocial-queue-transport-flag';
import { SystemParameterFeatureFlagProvider } from './system-parameter-feature-flag.provider';
import { SystemParametersService } from './system-parameters.service';
import {
  RppsTaxRateController,
  TaxRateController,
} from './tax-rate/tax-rate.controller';
import { TaxRateService } from './tax-rate/tax-rate.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [
    SystemParametersController,
    FeatureFlagsController,
    AdminMenusController,
    AdminPlatformController,
    TaxRateController,
    RppsTaxRateController,
  ],
  providers: [
    SystemParametersService,
    SystemParameterFeatureFlagProvider,
    EsocialQueueTransportFlag,
    AdminMenusService,
    AdminPlatformService,
    TaxRateService,
  ],
  exports: [
    SystemParametersService,
    SystemParameterFeatureFlagProvider,
    EsocialQueueTransportFlag,
  ],
})
export class SystemParametersModule {}
