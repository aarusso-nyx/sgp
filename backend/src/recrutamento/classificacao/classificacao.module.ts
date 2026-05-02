import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import {
  ClassificacaoController,
  PublicClassificacaoController,
} from './classificacao.controller';
import { ClassificacaoService } from './classificacao.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ClassificacaoController, PublicClassificacaoController],
  providers: [ClassificacaoService],
  exports: [ClassificacaoService],
})
export class ClassificacaoModule {}
