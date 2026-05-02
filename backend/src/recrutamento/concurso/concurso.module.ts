import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import {
  ConcursoController,
  PublicConcursoController,
} from './concurso.controller';
import { EditalController } from './edital.controller';
import { ConcursoService } from './concurso.service';
import { EditalService } from './edital.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ConcursoController, EditalController, PublicConcursoController],
  providers: [ConcursoService, EditalService],
  exports: [ConcursoService, EditalService],
})
export class ConcursoModule {}
