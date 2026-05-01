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
import { SystemParametersService } from './system-parameters.service';
import { TaxRateController } from './tax-rate/tax-rate.controller';
import { TaxRateService } from './tax-rate/tax-rate.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [
    SystemParametersController,
    FeatureFlagsController,
    AdminMenusController,
    AdminPlatformController,
    TaxRateController,
  ],
  providers: [
    SystemParametersService,
    AdminMenusService,
    AdminPlatformService,
    TaxRateService,
  ],
})
export class SystemParametersModule {}
