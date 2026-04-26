import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AgreementsController } from './agreements/agreements.controller';
import { AgreementsService } from './agreements/agreements.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [AgreementsController],
  providers: [AgreementsService],
})
export class ConvenioModule {}
