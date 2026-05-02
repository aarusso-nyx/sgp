import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { DirfBuilderService } from './dirf-builder.service';
import { DirfController } from './dirf.controller';
import { DirfFormatterService } from './dirf-formatter.service';
import { DirfValidatorService } from './dirf-validator.service';

@Module({
  imports: [AuditModule, DatabaseModule],
  controllers: [DirfController],
  providers: [DirfBuilderService, DirfFormatterService, DirfValidatorService],
  exports: [DirfBuilderService, DirfFormatterService, DirfValidatorService],
})
export class DirfModule {}
