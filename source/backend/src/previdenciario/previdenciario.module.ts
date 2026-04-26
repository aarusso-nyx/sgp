import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PrevidenciarioController } from './previdenciario.controller';
import { PrevidenciarioService } from './previdenciario.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [PrevidenciarioController],
  providers: [PrevidenciarioService],
})
export class PrevidenciarioModule {}
