import { Module } from '@nestjs/common';

import { AvaliacaoModule } from '../avaliacao/avaliacao.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PdfABuilderService } from '../report-service/payslip/pdf-a-builder.service';
import { PayslipController } from '../report-service/payslip/payslip.controller';
import { PayslipRenderService } from '../report-service/payslip/payslip-render.service';
import { YearlyIncomeBatchService } from '../report-service/yearly-income/yearly-income-batch.service';
import { YearlyIncomeController } from '../report-service/yearly-income/yearly-income.controller';
import { YearlyIncomeRenderService } from '../report-service/yearly-income/yearly-income-render.service';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [AuthModule, AvaliacaoModule, DatabaseModule],
  controllers: [PortalController, PayslipController, YearlyIncomeController],
  providers: [
    PortalService,
    PdfABuilderService,
    PayslipRenderService,
    YearlyIncomeRenderService,
    YearlyIncomeBatchService,
  ],
})
export class PortalModule {}
