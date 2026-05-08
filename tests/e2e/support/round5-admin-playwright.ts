import { expect, type Page, type Request } from '@playwright/test';

export interface ApiHit {
  method: string;
  path: string;
  query: Record<string, string>;
  authorization: string;
  body: unknown;
}

interface ApiResponse {
  status: number;
  body: unknown;
  contentType?: string;
  headers?: Record<string, string>;
}

interface BootOptions {
  hits?: ApiHit[];
  permissions?: string[];
}

const employeeId = '11111111-1111-4111-8111-111111111111';
const hourBankId = 'hb-2026-05';
const tceJobId = 'tce-job-1';

const round5AdminPermissions = [
  'auditoria.read',
  'fiscal.dctfweb.read',
  'fiscal.dctfweb.write',
  'ponto.hourbank.read',
  'ponto.hourbank.write',
  'recrutamento.read',
  'recrutamento.write',
  'tce.adapter.read',
  'tce.catalog.read',
  'tce.submission.read',
  'tce.submission.manage',
];
export const round5AdminAccessToken = e2eJwt({
  sub: 'admin-round5-sub',
  username: 'admin.round5',
  name: 'Admin Round 5',
  groups: ['ADMIN'],
  permissions: round5AdminPermissions,
  tenant_id: 'tenant-e2e',
});

export async function bootRound5Admin(page: Page, options: BootOptions = {}): Promise<void> {
  const permissions = options.permissions ?? round5AdminPermissions;

  await page.addInitScript(
    (accessToken) => {
      (window as unknown as { SGP_CONFIG: Record<string, string> }).SGP_CONFIG = {
        API_BASE_PATH: '/api',
        COGNITO_CLIENT_ID: 'admin-client',
        COGNITO_DOMAIN: 'https://idp.test',
        COGNITO_REDIRECT_URI: 'http://127.0.0.1:4210/auth/callback',
        DEFAULT_TENANT_ID: 'tenant-e2e',
        STYNX_E2E: 'true',
        STYNX_E2E_ACCESS_TOKEN: accessToken,
        TENANT_ID: 'tenant-e2e',
      };

      sessionStorage.setItem('sgp.access_token', accessToken);
    },
    permissions === round5AdminPermissions
      ? round5AdminAccessToken
      : e2eJwt({
          sub: 'admin-round5-sub',
          username: 'admin.round5',
          name: 'Admin Round 5',
          groups: ['ADMIN'],
          permissions,
          tenant_id: 'tenant-e2e',
        }),
  );

  await page.route('https://idp.test/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Admin login boundary</title>',
    });
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();
    const body = requestBody(request);

    options.hits?.push({
      method,
      path,
      query: Object.fromEntries(url.searchParams.entries()),
      authorization: request.headers()['authorization'] ?? '',
      body,
    });

    const response = responseFor(method, path);
    await route.fulfill({
      status: response.status,
      contentType: response.contentType ?? 'application/json',
      headers: response.headers,
      body:
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body ?? null),
    });
  });
}

export async function waitForHit(
  hits: ApiHit[],
  predicate: (candidate: ApiHit) => boolean,
): Promise<ApiHit> {
  let found: ApiHit | undefined;
  await expect
    .poll(() => {
      found = hits.find(predicate);
      return Boolean(found);
    })
    .toBe(true);
  return found as ApiHit;
}

export function formControl(page: Page, formControlName: string) {
  return page.locator(`[formcontrolname="${formControlName}"]`);
}

function requestBody(request: Request): unknown {
  const data = request.postData();
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function e2eJwt(claims: Record<string, unknown>): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...claims,
  };
  return ['e2e', base64Url(JSON.stringify(payload)), 'signature'].join('.');
}

function base64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function responseFor(method: string, path: string): ApiResponse {
  if (method === 'GET' && path === '/v1/auth/me') {
    return ok({ username: 'admin.round5', permissions: round5AdminPermissions });
  }
  if (method === 'GET' && path === '/v1/auth/menus') {
    return ok([{ id: 'admin', label: 'Admin' }]);
  }

  if (method === 'GET' && path === '/v1/admin/fiscal/dctfweb') {
    return ok([dctfwebDeclaration('dctf-ready', 'GENERATED')]);
  }
  if (method === 'POST' && path === '/v1/admin/fiscal/dctfweb/gerar') {
    return ok(dctfwebDeclaration('dctf-generated', 'GENERATED'));
  }
  if (method === 'POST' && path === '/v1/admin/fiscal/dctfweb/dctf-ready/assinar') {
    return ok(dctfwebDeclaration('dctf-ready', 'SIGNED'));
  }
  if (method === 'POST' && path === '/v1/admin/fiscal/dctfweb/dctf-ready/transmitir') {
    return ok(dctfwebDeclaration('dctf-ready', 'ACCEPTED'));
  }

  if (method === 'GET' && path === '/v1/ponto/banco-horas') {
    return ok([
      {
        hourBankId,
        employeeId,
        regime: '40H',
        openedAt: '2026-01-01',
        expiresAt: '2026-12-31',
        balanceMinutes: 120,
        status: 'OPEN',
      },
    ]);
  }
  if (method === 'GET' && path === `/v1/ponto/banco-horas/${hourBankId}/movimentos`) {
    return ok([hourBankMovement('IMPORT', 120)]);
  }
  if (method === 'POST' && path === '/v1/ponto/banco-horas/ajuste-manual') {
    return ok(hourBankMovement('MANUAL_ADJUSTMENT', 45));
  }

  if (method === 'GET' && path === '/v1/tce/queue') {
    return ok([tceJob('FAILED')]);
  }
  if (method === 'GET' && path === `/v1/tce/queue/${tceJobId}`) {
    return ok(tceJob('FAILED'));
  }
  if (method === 'POST' && path === `/v1/tce/queue/${tceJobId}/replay`) {
    return ok(tceJob('RETRY'));
  }
  if (method === 'GET' && path === '/v1/tce/circuits') {
    return ok([
      {
        adapterId: 'audesp-sp',
        endpointUrl: 'https://tce.test/audesp',
        state: 'OPEN',
        failureCount: 2,
        openedAt: '2026-05-04T10:00:00.000Z',
        lastFailureAt: '2026-05-04T10:00:00.000Z',
        lastSuccessAt: null,
      },
    ]);
  }
  if (method === 'POST' && path.startsWith('/v1/tce/circuits/')) {
    return ok({
      adapterId: 'audesp-sp',
      endpointUrl: 'https://tce.test/audesp',
      state: 'CLOSED',
      failureCount: 0,
      openedAt: null,
      lastFailureAt: '2026-05-04T10:00:00.000Z',
      lastSuccessAt: '2026-05-04T11:00:00.000Z',
    });
  }

  return ok({});
}

function ok(body: unknown): ApiResponse {
  return { status: 200, body };
}

function dctfwebDeclaration(id: string, status: string): Record<string, unknown> {
  return {
    id,
    competence: '2026-05',
    kind: 'ORIGINAL',
    status,
    originalDeclarationId: null,
    payloadXmlRef: `fiscal/dctfweb/${id}.xml`,
    payloadXmlHash: `payload-${id}`,
    signedXmlRef: status === 'GENERATED' ? null : `fiscal/dctfweb/${id}-signed.xml`,
    signedXmlHash: status === 'GENERATED' ? null : `signed-${id}`,
    transmittedXmlHash: status === 'ACCEPTED' ? `transmitted-${id}` : null,
    receiptNumber: status === 'ACCEPTED' ? 'RFB-2026-05' : null,
    receiptAt: status === 'ACCEPTED' ? '2026-05-04T12:00:00.000Z' : null,
    itemCount: 1,
    totalBaseAmount: '1000.00',
    totalAmount: '110.00',
    createdAt: '2026-05-04T11:00:00.000Z',
    updatedAt: '2026-05-04T11:30:00.000Z',
    items: [
      {
        id: `${id}-item`,
        sourceEvent: 'S-1200',
        sourceRunId: 'payroll-run-2026-05',
        debitCode: '1082',
        baseAmount: '1000.00',
        amount: '110.00',
      },
    ],
  };
}

function hourBankMovement(kind: string, minutes: number): Record<string, unknown> {
  return {
    hourBankMovementId: `mov-${kind.toLowerCase()}`,
    hourBankId,
    workDate: '2026-05-04',
    kind,
    minutes,
    createdAt: '2026-05-04T12:00:00.000Z',
    payrollRunId: null,
  };
}

function tceJob(status: string): Record<string, unknown> {
  return {
    id: tceJobId,
    submissionId: 'tce-submission-1',
    adapterId: 'audesp-sp',
    endpointUrl: 'https://tce.test/audesp',
    stateCode: 'SP',
    competenceYear: 2026,
    competenceMonth: 5,
    status,
    attempts: status === 'RETRY' ? 2 : 1,
    maxAttempts: 5,
    nextAttemptAt: '2026-05-04T12:30:00.000Z',
    lockedBy: null,
    lockedAt: null,
    lastErrorKind: status === 'FAILED' ? 'HTTP_500' : null,
    lastErrorPayload: status === 'FAILED' ? { statusCode: 500 } : null,
    attemptsHistory: [
      {
        id: 'attempt-1',
        attemptNumber: 1,
        outcome: status === 'FAILED' ? 'FAILED' : 'RETRY_SCHEDULED',
        startedAt: '2026-05-04T11:00:00.000Z',
        finishedAt: '2026-05-04T11:00:05.000Z',
        errorPayload: status === 'FAILED' ? { statusCode: 500 } : null,
      },
    ],
  };
}
