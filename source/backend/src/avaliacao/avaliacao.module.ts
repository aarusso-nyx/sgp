import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AvaliacaoController } from './avaliacao.controller';
import { AvaliacaoService } from './avaliacao.service';
import { ProbationController } from './probation.controller';
import { ProbationService } from './probation.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [AvaliacaoController, ProbationController],
  providers: [AvaliacaoService, ProbationService],
})
export class AvaliacaoModule {}
