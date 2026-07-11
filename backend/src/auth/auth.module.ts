import { Module } from '@nestjs/common';
import {
  AuthContextGuard,
  AuthorizationGuard,
  STYNX_TOKEN_VERIFIER,
} from '@stynx-nyx/backend';

import {
  InMemoryQueueTransport,
  type QueueAdapterTransport,
} from '../common/adapters';
import { GovBrRelayMockResponder } from '../external/mocks/govbr-relay';
import { IamModule } from '../iam/iam.module';
import { GovBrQueueAdapter } from './govbr/adapters/queue-adapter';
import { GovBrSignController } from './govbr/sign.controller';
import { GovBrSignService } from './govbr/sign.service';
import {
  normalizeTokenVerifierResult,
  SgpStynxAuthGuard,
  SgpStynxAuthorizationGuard,
} from './sgp-stynx-auth.guard';
import { SgpStynxTokenVerifier } from './sgp-stynx-token-verifier.service';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';

const GOVBR_SIGN_QUEUE_TRANSPORT = Symbol('GOVBR_SIGN_QUEUE_TRANSPORT');

@Module({
  imports: [IamModule],
  controllers: [SessionController, GovBrSignController],
  providers: [
    SessionService,
    SgpStynxTokenVerifier,
    {
      provide: STYNX_TOKEN_VERIFIER,
      useFactory: (verifier: SgpStynxTokenVerifier) => ({
        verifyAuthorizationHeader: async (
          value: string | string[] | undefined,
        ) =>
          normalizeTokenVerifierResult(
            await verifier.verifyAuthorizationHeader(value),
          ),
      }),
      inject: [SgpStynxTokenVerifier],
    },
    AuthContextGuard,
    AuthorizationGuard,
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
    SgpStynxTokenVerifier,
    AuthContextGuard,
    AuthorizationGuard,
    SgpStynxAuthGuard,
    SgpStynxAuthorizationGuard,
  ],
})
export class AuthModule {}
