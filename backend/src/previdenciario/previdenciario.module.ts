import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ESocialWorkerModule } from '../esocial-worker/esocial-worker.module';
import { AposentadoriaService } from './aposentadoria/aposentadoria.service';
import { CtcService } from './ctc/ctc.service';
import { DeclaracaoService } from './declaracao/declaracao.service';
import { PensaoService } from './pensao/pensao.service';
import { PrevidenciarioController } from './previdenciario.controller';
import { PrevidenciarioService } from './previdenciario.service';
import { RecadastramentoService } from './recadastramento/recadastramento.service';
import { RegrasSimulationService } from './regras/regras-simulation.service';
import { RegrasService } from './regras/regras.service';
import { AtividadeRiscoProfessorService } from './transition-rules/atividade-risco-professor.service';
import { IdadeProgressivaService } from './transition-rules/idade-progressiva.service';
import { Pedagio100Service } from './transition-rules/pedagio100.service';
import { Pedagio50Service } from './transition-rules/pedagio50.service';
import { PontosService } from './transition-rules/pontos.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, ESocialWorkerModule],
  controllers: [PrevidenciarioController],
  providers: [
    PrevidenciarioService,
    RegrasService,
    AposentadoriaService,
    PensaoService,
    CtcService,
    DeclaracaoService,
    RecadastramentoService,
    RegrasSimulationService,
    Pedagio100Service,
    Pedagio50Service,
    PontosService,
    IdadeProgressivaService,
    AtividadeRiscoProfessorService,
  ],
})
export class PrevidenciarioModule {}
