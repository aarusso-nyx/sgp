import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AsoAttachmentService } from './aso/aso-attachment.service';
import { AsoController } from './aso/aso.controller';
import { AsoPortalController } from './aso/aso-portal.controller';
import { AsoService } from './aso/aso.service';
import { PericiaController } from './pericia.controller';
import { PericiaService } from './pericia.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [PericiaController, AsoController, AsoPortalController],
  providers: [PericiaService, AsoService, AsoAttachmentService],
})
export class SaudeModule {}
