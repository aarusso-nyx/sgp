import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PericiaController } from './pericia.controller';
import { PericiaService } from './pericia.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [PericiaController],
  providers: [PericiaService],
})
export class SaudeModule {}
