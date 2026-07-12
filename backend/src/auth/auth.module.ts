import { Module } from '@nestjs/common';
import {
  InMemoryQueueTransport,
  type QueueAdapterTransport,
} from '../common/adapters';
import { GovBrRelayMockResponder } from '../external/mocks/govbr-relay';
import { IamModule } from '../iam/iam.module';
import { SgpStynxIdentityModule } from '../stynx/sgp-stynx-identity.module';
import { GovBrQueueAdapter } from './govbr/adapters/queue-adapter';
import { GovBrSignController } from './govbr/sign.controller';
import { GovBrSignService } from './govbr/sign.service';
import {
  SgpStynxAuthGuard,
  SgpStynxAuthorizationGuard,
} from './sgp-stynx-auth.guard';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';

const GOVBR_SIGN_QUEUE_TRANSPORT = Symbol('GOVBR_SIGN_QUEUE_TRANSPORT');
const sgpStynxIdentityModule = SgpStynxIdentityModule.forRoot();

@Module({
  imports: [IamModule, sgpStynxIdentityModule],
  controllers: [SessionController, GovBrSignController],
  providers: [
    SessionService,
    SgpStynxAuthGuard,
    SgpStynxAuthorizationGuard,
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
  exports: [
    sgpStynxIdentityModule,
    SgpStynxAuthGuard,
    SgpStynxAuthorizationGuard,
  ],
})
export class AuthModule {}
