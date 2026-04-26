import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ExternalController } from './external.controller';
import { ExternalService } from './external.service';

@Module({
  imports: [AuthModule],
  controllers: [ExternalController],
  providers: [ExternalService],
})
export class ExternalModule {}
