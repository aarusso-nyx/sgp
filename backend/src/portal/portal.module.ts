import { Module } from '@nestjs/common';

import { AvaliacaoModule } from '../avaliacao/avaliacao.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ReportServiceModule } from '../report-service/report-service.module';
import { LgpdModule } from '../common/lgpd/lgpd.module';
import { LgpdRightsController } from './lgpd-rights.controller';
import { LgpdRightsService } from './lgpd-rights.service';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [
    AuthModule,
    AvaliacaoModule,
    DatabaseModule,
    LgpdModule,
    ReportServiceModule,
  ],
  controllers: [PortalController, LgpdRightsController],
  providers: [PortalService, LgpdRightsService],
})
export class PortalModule {}
