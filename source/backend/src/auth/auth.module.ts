import { Module } from '@nestjs/common';

import { IamModule } from '../iam/iam.module';
import { CognitoJwtGuard } from './cognito-jwt.guard';
import { CognitoJwtService } from './cognito-jwt.service';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';

@Module({
  imports: [IamModule],
  controllers: [SessionController],
  providers: [SessionService, CognitoJwtService, CognitoJwtGuard],
  exports: [CognitoJwtService, CognitoJwtGuard],
})
export class AuthModule {}
