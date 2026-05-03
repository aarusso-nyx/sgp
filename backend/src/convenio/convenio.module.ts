import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AgreementsController } from './agreements/agreements.controller';
import { AgreementsService } from './agreements/agreements.service';
import { InternshipsController } from './internships/internships.controller';
import { InternshipsService } from './internships/internships.service';
import { S2300Builder } from '../esocial-worker/builders/s2300.builder';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [AgreementsController, InternshipsController],
  providers: [AgreementsService, InternshipsService, S2300Builder],
})
export class ConvenioModule {}
