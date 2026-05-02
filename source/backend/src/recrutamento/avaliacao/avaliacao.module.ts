import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { GabaritoController } from './gabarito.controller';
import { GabaritoService } from './gabarito.service';
import { NotaController, PublicNotaController } from './nota.controller';
import { NotaService } from './nota.service';
import { ProvaController } from './prova.controller';
import { ProvaService } from './prova.service';
import {
  PublicRecursoController,
  RecursoController,
} from './recurso.controller';
import { RecursoService } from './recurso.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    ProvaController,
    GabaritoController,
    RecursoController,
    PublicRecursoController,
    NotaController,
    PublicNotaController,
  ],
  providers: [ProvaService, GabaritoService, RecursoService, NotaService],
  exports: [ProvaService, GabaritoService, RecursoService, NotaService],
})
export class RecrutamentoAvaliacaoModule {}
