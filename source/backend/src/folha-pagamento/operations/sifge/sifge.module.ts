import { Module } from '@nestjs/common';

import { AuditModule } from '../../../audit/audit.module';
import { DatabaseModule } from '../../../database/database.module';
import { CaixaSifgeAdapter, SIFGE_ADAPTERS } from './caixa-adapter.contract';
import { CaixaSifgeMockAdapter } from './caixa-sifge-mock.adapter';
import { CaixaSifgeV4Adapter } from './caixa-sifge-v4.adapter';
import { SifgeController } from './sifge.controller';
import { SifgeService } from './sifge.service';

@Module({
  imports: [AuditModule, DatabaseModule],
  controllers: [SifgeController],
  providers: [
    CaixaSifgeV4Adapter,
    CaixaSifgeMockAdapter,
    {
      provide: SIFGE_ADAPTERS,
      useFactory: (
        v4: CaixaSifgeV4Adapter,
        mock: CaixaSifgeMockAdapter,
      ): CaixaSifgeAdapter[] => [v4, mock],
      inject: [CaixaSifgeV4Adapter, CaixaSifgeMockAdapter],
    },
    SifgeService,
  ],
  exports: [SifgeService],
})
export class SifgeModule {}
