import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { ConcursoModule } from './concurso/concurso.module';
import { InscricaoModule } from './inscricao/inscricao.module';
import { RecrutamentoAvaliacaoModule } from './avaliacao/avaliacao.module';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    AuditModule,
    ConcursoModule,
    InscricaoModule,
    RecrutamentoAvaliacaoModule,
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
})
export class RecruitmentModule {}
