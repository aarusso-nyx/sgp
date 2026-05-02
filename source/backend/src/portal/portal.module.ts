import { Module } from '@nestjs/common';

import { AvaliacaoModule } from '../avaliacao/avaliacao.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PdfABuilderService } from '../report-service/payslip/pdf-a-builder.service';
import { PayslipController } from '../report-service/payslip/payslip.controller';
import { PayslipRenderService } from '../report-service/payslip/payslip-render.service';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [AuthModule, AvaliacaoModule, DatabaseModule],
  controllers: [PortalController, PayslipController],
  providers: [PortalService, PdfABuilderService, PayslipRenderService],
})
export class PortalModule {}
