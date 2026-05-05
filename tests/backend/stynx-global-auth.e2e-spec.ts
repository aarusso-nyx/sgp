import {
  Controller,
  Get,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  AuthContextGuard,
  AuthorizationGuard,
  STYNX_TOKEN_VERIFIER,
} from '@stynx/backend';
import type { TokenVerifier } from '@stynx/contracts';
import request from 'supertest';
import type { App as SupertestApp } from 'supertest/types';

import {
  SgpStynxAuthGuard,
  SgpStynxAuthorizationGuard,
} from '../../backend/src/auth/sgp-stynx-auth.guard';
import {
  Public,
  RequirePermission,
} from '../../backend/src/iam/decorators/require-permission.decorator';

const TENANT_ID = '00000000-0000-4000-8000-000000000001';

@Controller('qa/stynx-auth')
class StynxAuthProbeController {
  @Public()
  @Get('public')
  publicRoute() {
    return { ok: true };
  }

  @RequirePermission('gestao.read')
  @Get('protected')
  protectedRoute() {
    return { ok: true };
  }
}

describe('SGP Stynx global auth guards (e2e)', () => {
  let app: INestApplication<SupertestApp>;
  const verifier: jest.Mocked<TokenVerifier> = {
    verifyAuthorizationHeader: jest.fn(async () => ({
      principal: {
        id: 'user-1',
        username: 'test.user',
        roles: ['SGP_ADMIN'],
        permissions: ['gestao.read'],
        tenants: [TENANT_ID],
        claims: {},
      },
      token: 'test',
    })),
  };

  beforeEach(async () => {
    verifier.verifyAuthorizationHeader.mockClear();
    const moduleRef = await Test.createTestingModule({
      controllers: [StynxAuthProbeController],
      providers: [
        {
          provide: STYNX_TOKEN_VERIFIER,
          useValue: verifier,
        },
        AuthContextGuard,
        AuthorizationGuard,
        SgpStynxAuthGuard,
        SgpStynxAuthorizationGuard,
        {
          provide: APP_GUARD,
          useClass: SgpStynxAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: SgpStynxAuthorizationGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows anonymous requests to public routes', async () => {
    await request(app.getHttpServer())
      .get('/qa/stynx-auth/public')
      .expect(200)
      .expect({ ok: true });

    expect(verifier.verifyAuthorizationHeader.mock.calls).toHaveLength(0);
  });

  it('rejects anonymous requests to protected routes', async () => {
    verifier.verifyAuthorizationHeader.mockRejectedValueOnce(
      new UnauthorizedException('Missing bearer token'),
    );

    await request(app.getHttpServer())
      .get('/qa/stynx-auth/protected')
      .expect(401);
  });

  it('allows authenticated requests with the required permission', async () => {
    await request(app.getHttpServer())
      .get('/qa/stynx-auth/protected')
      .set('Authorization', 'Bearer test')
      .expect(200)
      .expect({ ok: true });

    expect(verifier.verifyAuthorizationHeader.mock.calls).toEqual([
      ['Bearer test'],
    ]);
  });
});
