import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { BiometriaModule } from './biometria/biometria.module';
import { ClassificacaoModule } from './classificacao/classificacao.module';
import { ConcursoModule } from './concurso/concurso.module';
import { InscricaoModule } from './inscricao/inscricao.module';
import { NomeacaoModule } from './nomeacao/nomeacao.module';
import { PosseModule } from './posse/posse.module';
import { RecrutamentoAvaliacaoModule } from './avaliacao/avaliacao.module';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    AuditModule,
    BiometriaModule,
    ConcursoModule,
    InscricaoModule,
    RecrutamentoAvaliacaoModule,
    ClassificacaoModule,
    NomeacaoModule,
    PosseModule,
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
})
export class RecruitmentModule {}
