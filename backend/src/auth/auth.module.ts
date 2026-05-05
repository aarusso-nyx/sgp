import { Module } from '@nestjs/common';

import {
  InMemoryQueueTransport,
  type QueueAdapterTransport,
} from '../common/adapters';
import { GovBrRelayMockResponder } from '../external/mocks/govbr-relay';
import { IamModule } from '../iam/iam.module';
import { CognitoJwtGuard } from './cognito-jwt.guard';
import { CognitoJwtService } from './cognito-jwt.service';
import { GovBrQueueAdapter } from './govbr/adapters/queue-adapter';
import { GovBrSignController } from './govbr/sign.controller';
import { GovBrSignService } from './govbr/sign.service';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';

const GOVBR_SIGN_QUEUE_TRANSPORT = Symbol('GOVBR_SIGN_QUEUE_TRANSPORT');

@Module({
  imports: [IamModule],
  controllers: [SessionController, GovBrSignController],
  providers: [
    SessionService,
    CognitoJwtService,
    CognitoJwtGuard,
    {
      provide: GOVBR_SIGN_QUEUE_TRANSPORT,
      useFactory: () => new InMemoryQueueTransport(),
    },
    {
      provide: GovBrRelayMockResponder,
      useFactory: (transport: QueueAdapterTransport) =>
        new GovBrRelayMockResponder({ transport }),
      inject: [GOVBR_SIGN_QUEUE_TRANSPORT],
    },
    {
      provide: GovBrQueueAdapter,
      useFactory: (transport: QueueAdapterTransport) =>
        new GovBrQueueAdapter({ transport }),
      inject: [GOVBR_SIGN_QUEUE_TRANSPORT],
    },
    GovBrSignService,
  ],
  exports: [CognitoJwtService, CognitoJwtGuard],
})
export class AuthModule {}
