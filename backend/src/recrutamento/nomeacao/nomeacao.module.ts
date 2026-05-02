import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { NomeacaoController } from './nomeacao.controller';
import { NomeacaoService } from './nomeacao.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NomeacaoController],
  providers: [NomeacaoService],
  exports: [NomeacaoService],
})
export class NomeacaoModule {}
