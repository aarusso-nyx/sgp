import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ReportCatalogController } from './report-catalog/report-catalog.controller';
import { ReportCatalogService } from './report-catalog/report-catalog.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [ReportCatalogController],
  providers: [ReportCatalogService],
})
export class RelatorioModule {}
