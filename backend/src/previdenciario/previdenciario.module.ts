import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StynxEsocialModule } from '../integrations/stynx-esocial';
import { AposentadoriaService } from './aposentadoria/aposentadoria.service';
import { CtcService } from './ctc/ctc.service';
import { DeclaracaoService } from './declaracao/declaracao.service';
import { PensaoService } from './pensao/pensao.service';
import { PrevidenciarioController } from './previdenciario.controller';
import { PrevidenciarioRecertificationController } from './previdenciario-recertification.controller';
import { PrevidenciarioRulesController } from './previdenciario-rules.controller';
import { PrevidenciarioService } from './previdenciario.service';
import {
  PREVIDENCIARIO_SERVICE_REGISTRY,
  type PrevidenciarioServiceRegistry,
} from './previdenciario.tokens';
import { RecadastramentoService } from './recadastramento/recadastramento.service';
import { RegrasSimulationService } from './regras/regras-simulation.service';
import { RegrasService } from './regras/regras.service';
import { AtividadeRiscoProfessorService } from './transition-rules/atividade-risco-professor.service';
import { IdadeProgressivaService } from './transition-rules/idade-progressiva.service';
import { Pedagio100Service } from './transition-rules/pedagio100.service';
import { Pedagio50Service } from './transition-rules/pedagio50.service';
import { PontosService } from './transition-rules/pontos.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, StynxEsocialModule],
  controllers: [
    PrevidenciarioController,
    PrevidenciarioRulesController,
    PrevidenciarioRecertificationController,
  ],
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
    {
      provide: PREVIDENCIARIO_SERVICE_REGISTRY,
      useFactory: (
        regras: RegrasService,
        aposentadoria: AposentadoriaService,
        pensao: PensaoService,
        ctc: CtcService,
        declaracao: DeclaracaoService,
        recadastramento: RecadastramentoService,
      ): PrevidenciarioServiceRegistry => ({
        regras,
        aposentadoria,
        pensao,
        ctc,
        declaracao,
        recadastramento,
      }),
      inject: [
        RegrasService,
        AposentadoriaService,
        PensaoService,
        CtcService,
        DeclaracaoService,
        RecadastramentoService,
      ],
    },
  ],
})
export class PrevidenciarioModule {}
