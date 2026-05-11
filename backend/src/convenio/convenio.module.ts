import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AgreementsController } from './agreements/agreements.controller';
import { AgreementsService } from './agreements/agreements.service';
import { InternshipsController } from './internships/internships.controller';
import { InternshipEsocialService } from './internships/internship-esocial.service';
import { InternshipLifecycleService } from './internships/internship-lifecycle.service';
import { InternshipProgramsService } from './internships/internship-programs.service';
import { InternshipsService } from './internships/internships.service';
import { StynxEsocialModule } from '../integrations/stynx-esocial';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, StynxEsocialModule],
  controllers: [AgreementsController, InternshipsController],
  providers: [
    AgreementsService,
    InternshipProgramsService,
    InternshipLifecycleService,
    InternshipEsocialService,
    InternshipsService,
  ],
})
export class ConvenioModule {}
