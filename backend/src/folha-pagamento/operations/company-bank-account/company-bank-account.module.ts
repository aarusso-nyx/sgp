import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../../database/database.module';
import { CompanyBankAccountService } from './company-bank-account.service';

@Module({
  imports: [DatabaseModule],
  providers: [CompanyBankAccountService],
  exports: [CompanyBankAccountService],
})
export class CompanyBankAccountModule {}
