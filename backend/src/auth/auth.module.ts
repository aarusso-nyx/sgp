import { Module } from '@nestjs/common';

import { IamModule } from '../iam/iam.module';
import { CognitoJwtGuard } from './cognito-jwt.guard';
import { CognitoJwtService } from './cognito-jwt.service';
import { GovBrSignatureSandboxAdapter } from './govbr/govbr-signature-sandbox.adapter';
import { GovBrSignController } from './govbr/sign.controller';
import { GovBrSignService } from './govbr/sign.service';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';

@Module({
  imports: [IamModule],
  controllers: [SessionController, GovBrSignController],
  providers: [
    SessionService,
    CognitoJwtService,
    CognitoJwtGuard,
    GovBrSignService,
    GovBrSignatureSandboxAdapter,
  ],
  exports: [CognitoJwtService, CognitoJwtGuard],
})
export class AuthModule {}
