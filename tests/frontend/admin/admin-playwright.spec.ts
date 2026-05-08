import { expect, test, type Locator, type Page, type Request } from '@playwright/test';

interface ApiHit {
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
  authenticated?: boolean;
  hits?: ApiHit[];
  permissions?: string[];
}

const employeeId = '11111111-1111-4111-8111-111111111111';
const repDeviceId = '33333333-3333-4333-8333-333333333333';

const adminPermissions = [
  'auditoria.read',
  'folha.read',
  'folha.write',
  'gestao.read',
  'gestao.write',
  'ponto.afd.read',
  'ponto.afd.write',
  'payroll.run.execute',
  'rh.employee.read',
  'rh.employee.terminate',
  'rh.employee.write',
];
const adminAccessToken = e2eJwt({
  sub: 'admin-e2e-sub',
  username: 'admin.e2e',
  name: 'Admin E2E',
  groups: ['ADMIN'],
  permissions: adminPermissions,
  tenant_id: 'tenant-e2e',
});

test.describe('SGP admin Playwright e2e', () => {
  test('redirects anonymous admin users to the Cognito login boundary', async ({ page }) => {
    await bootAdmin(page, { authenticated: false });

    await page.goto('/folha/competencia/mensal');

    await expect(page).toHaveURL(/idp\.test\/oauth2\/authorize/);
    const loginUrl = new URL(page.url());
    expect(loginUrl.searchParams.get('client_id')).toBe('admin-client');
    expect(loginUrl.searchParams.get('response_type')).toBe('code');
    expect(loginUrl.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:4210/auth/callback');
  });

  test('renders the authenticated admin shell and RBAC menu catalog', async ({ page }) => {
    await bootAdmin(page);

    await page.goto('/');

    await expect(page.getByText('Admin E2E')).toBeVisible();
    await expect(page.getByRole('link', { name: /Atividade/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Banco/ })).toBeVisible();
  });

  test('blocks payroll execution when the RBAC catalog lacks the route permission', async ({
    page,
  }) => {
    await bootAdmin(page, { permissions: ['rh.employee.read'] });

    await page.goto('/folha/competencia/mensal');

    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByText('Acesso negado')).toBeVisible();
  });

  test('renders the audit RBAC catalog metadata from the live admin feature table', async ({
    page,
  }) => {
    await bootAdmin(page);

    await page.goto('/auditoria/trilha/gestao');

    await expect(page.getByRole('heading', { name: 'Consulta de Trilha' }).first()).toBeVisible();
    await expect(page.getByText('/auditoria/trilha/gestao').first()).toBeVisible();
    await expect(page.getByText('AUDITORIA.GESTAO').first()).toBeVisible();
    await expect(page.getByLabel('Metadados da tela')).toContainText('Papel');
  });

  test('filters the audit catalog workspace as the current routed audit search surface', async ({
    page,
  }) => {
    await bootAdmin(page);

    await page.goto('/auditoria/trilha/gestao');
    await page.getByRole('textbox', { name: 'Pesquisar' }).fill('pend');
    await page.getByRole('button', { name: 'Pesquisar' }).click();

    await expect(page.getByText(/Consulta de Trilha - pend/)).toBeVisible();
    await expect(page.getByText(/Consulta de Trilha - revis/)).toHaveCount(0);
  });

  test('creates a local audit catalog record through the admin workspace form', async ({
    page,
  }) => {
    await bootAdmin(page);

    await page.goto('/auditoria/trilha/gestao');
    await page.getByRole('button', { name: 'Novo' }).click();
    const form = page.locator('section[aria-label="Formulário da tela"]');
    await fillControl(form, 'title', 'Filtro LGPD por request id');
    await fillControl(form, 'owner', 'Auditor Interno');
    await fillControl(form, 'notes', 'Pesquisa operacional auditada');
    await form.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Registro incluído no workspace.')).toBeVisible();
    await expect(page.getByText('Filtro LGPD por request id')).toBeVisible();
  });

  test('loads the monthly payroll close workflow route', async ({ page }) => {
    await bootAdmin(page);

    await page.goto('/folha/competencia/mensal');

    await expect(page.getByRole('heading', { name: 'Folha mensal' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fechar' })).toBeVisible();
  });

  test('posts the monthly payroll close command with competence fields', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/folha/competencia/mensal');
    await fillControl(page.locator('form.toolbar'), 'year', '2026');
    await fillControl(page.locator('form.toolbar'), 'month', '5');
    await page.getByRole('button', { name: 'Fechar' }).click();

    const hit = await waitForHit(
      hits,
      (candidate) => candidate.path === '/v1/folhas/mensal/fechar',
    );
    expect(hit.method).toBe('POST');
    expect(hit.authorization).toBe(`Bearer ${adminAccessToken}`);
    expect(hit.body).toMatchObject({ year: 2026, month: 5 });
  });

  test('requests a monthly payroll review through the current review endpoint', async ({
    page,
  }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/folha/competencia/mensal');
    await fillControl(page.locator('form.toolbar'), 'year', '2026');
    await fillControl(page.locator('form.toolbar'), 'month', '5');
    await page.getByRole('button', { name: 'Revisao' }).click();

    const hit = await waitForHit(
      hits,
      (candidate) => candidate.path === '/v1/folhas/mensal/revisao',
    );
    expect(hit.method).toBe('GET');
    expect(hit.query).toMatchObject({ year: '2026', month: '5' });
  });

  test('loads employee CRUD data through the funcionario list endpoint', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/rh/funcionarios');

    await expect(page.getByRole('heading', { name: 'Cadastro do servidor' }).first()).toBeVisible();
    const hit = await waitForHit(hits, (candidate) => candidate.path === '/v1/funcionarios');
    expect(hit.method).toBe('GET');
    expect(hit.query).toMatchObject({ page: '1', pageSize: '50' });
  });

  test('searches employees with the current RH list query contract', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/rh/funcionarios');
    await page.locator('input[type="search"]').fill('Ana Admin');
    await page.getByRole('button', { name: 'Pesquisar' }).click();

    const hit = await waitForHit(
      hits,
      (candidate) =>
        candidate.path === '/v1/funcionarios' && candidate.query.search === 'Ana Admin',
    );
    expect(hit.authorization).toBe(`Bearer ${adminAccessToken}`);
  });

  test('admits an employee through the current employee create command', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/rh/funcionarios');
    const admission = formByHeading(page, 'Admissao');
    await fillControl(admission, 'registration', 'ADM-2030');
    await fillControl(admission, 'name', 'Bruno Admin');
    await fillControl(admission, 'cpf', '11122233344');
    await fillControl(admission, 'email', 'bruno.admin@example.test');
    await fillControl(admission, 'hiredOn', '2026-05-03');
    await admission.getByRole('button', { name: 'Admitir' }).click();

    const hit = await waitForHit(
      hits,
      (candidate) => candidate.method === 'POST' && candidate.path === '/v1/funcionarios',
    );
    expect(hit.body).toMatchObject({
      registration: 'ADM-2030',
      name: 'Bruno Admin',
      hiredOn: '2026-05-03',
    });
  });

  test('terminates an employee through the current employee desligamento command', async ({
    page,
  }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/rh/funcionarios');
    const termination = formByHeading(page, 'Desligamento');
    await fillControl(termination, 'employeeId', employeeId);
    await fillControl(termination, 'terminationDate', '2026-05-31');
    await fillControl(termination, 'terminationReasonId', '44444444-4444-4444-8444-444444444444');
    await fillControl(termination, 'justification', 'Encerramento e2e');
    await termination.getByRole('button', { name: 'Desligar' }).click();

    const hit = await waitForHit(
      hits,
      (candidate) => candidate.path === `/v1/funcionarios/${employeeId}/desligamento`,
    );
    expect(hit.method).toBe('POST');
    expect(hit.body).toMatchObject({
      terminationDate: '2026-05-31',
      terminationReasonId: '44444444-4444-4444-8444-444444444444',
    });
  });

  test('loads the Ponto AFD export and import histories', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/ponto/afd');

    await expect(page.getByRole('heading', { name: 'AFD' }).first()).toBeVisible();
    await waitForHit(hits, (candidate) => candidate.path === '/v1/ponto/afd/exports');
    await waitForHit(hits, (candidate) => candidate.path === '/v1/ponto/afd/imports');
  });

  test('generates a Ponto AFD export through the current export command', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/ponto/afd');
    const generation = formByHeading(page, 'Geracao');
    await fillControl(generation, 'repDeviceId', repDeviceId);
    await fillControl(generation, 'periodStart', '2026-05-01T00:00');
    await fillControl(generation, 'periodEnd', '2026-05-31T23:59');
    await generation.getByRole('button', { name: 'Gerar AFD' }).click();

    const hit = await waitForHit(
      hits,
      (candidate) => candidate.method === 'POST' && candidate.path === '/v1/ponto/afd/exports',
    );
    expect(hit.body).toMatchObject({
      repDeviceId,
      periodStart: '2026-05-01T00:00',
      periodEnd: '2026-05-31T23:59',
    });
  });

  test('imports a Ponto AFD file through the current import command', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/ponto/afd');
    const importForm = formByHeading(page, 'Importacao');
    await fillControl(importForm, 'repDeviceId', repDeviceId);
    await fillControl(importForm, 'fileName', 'afd-e2e.txt');
    await fillControl(importForm, 'content', '000000000AFD-E2E');
    await importForm.getByRole('button', { name: 'Importar AFD' }).click();

    const hit = await waitForHit(
      hits,
      (candidate) => candidate.method === 'POST' && candidate.path === '/v1/ponto/afd/imports',
    );
    expect(hit.body).toMatchObject({
      repDeviceId,
      fileName: 'afd-e2e.txt',
      content: '000000000AFD-E2E',
    });
  });

  test('downloads a ready Ponto AFD export through the current download contract', async ({
    page,
  }) => {
    const hits: ApiHit[] = [];
    await bootAdmin(page, { hits });

    await page.goto('/ponto/afd');
    const download = await page.evaluate(async () => {
      const response = await fetch('/api/v1/ponto/afd/exports/afd-ready/download');
      return {
        status: response.status,
        disposition: response.headers.get('content-disposition'),
        text: await response.text(),
      };
    });

    expect(download).toMatchObject({
      status: 200,
      disposition: 'attachment; filename="afd-ready.txt"',
      text: 'AFD-E2E-DOWNLOAD',
    });
    await waitForHit(
      hits,
      (candidate) => candidate.path === '/v1/ponto/afd/exports/afd-ready/download',
    );
  });
});

async function bootAdmin(page: Page, options: BootOptions = {}): Promise<void> {
  const authenticated = options.authenticated ?? true;
  const permissions = options.permissions ?? adminPermissions;

  await page.addInitScript(
    ({ accessToken, isAuthenticated }) => {
      (window as unknown as { SGP_CONFIG: Record<string, string> }).SGP_CONFIG = {
        API_BASE_PATH: '/api',
        COGNITO_CLIENT_ID: 'admin-client',
        COGNITO_DOMAIN: 'https://idp.test',
        COGNITO_REDIRECT_URI: 'http://127.0.0.1:4210/auth/callback',
        DEFAULT_TENANT_ID: 'tenant-e2e',
        STYNX_E2E: 'true',
        STYNX_E2E_ACCESS_TOKEN: isAuthenticated ? accessToken : '',
        TENANT_ID: 'tenant-e2e',
      };

      if (isAuthenticated) {
        sessionStorage.setItem('sgp.access_token', accessToken);
      } else {
        sessionStorage.clear();
      }
    },
    {
      accessToken:
        permissions === adminPermissions
          ? adminAccessToken
          : e2eJwt({
              sub: 'admin-e2e-sub',
              username: 'admin.e2e',
              name: 'Admin E2E',
              groups: ['ADMIN'],
              permissions,
              tenant_id: 'tenant-e2e',
            }),
      isAuthenticated: authenticated,
    },
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

async function fillControl(root: Locator, formControlName: string, value: string): Promise<void> {
  await root.locator(`[formcontrolname="${formControlName}"]`).fill(value);
}

function formByHeading(page: Page, heading: string): Locator {
  return page.locator('form').filter({ has: page.getByRole('heading', { name: heading }) });
}

async function waitForHit(
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
    return ok({ username: 'admin.e2e', permissions: adminPermissions });
  }
  if (method === 'GET' && path === '/v1/auth/menus') {
    return ok([{ id: 'admin', label: 'Admin' }]);
  }

  if (path === '/v1/folhas/mensal/revisao') {
    return ok(monthlyPayrollResult('REVIEWED'));
  }
  if (method === 'POST' && path.startsWith('/v1/folhas/mensal/')) {
    const action = path.split('/').at(-1)?.toUpperCase() ?? 'UPDATED';
    return ok(monthlyPayrollResult(action));
  }

  if (method === 'GET' && path === '/v1/funcionarios') {
    return ok({
      items: [employeeRecord()],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
  }
  if (method === 'POST' && path === '/v1/funcionarios') {
    return ok({
      employee: {
        ...employeeRecord(),
        id: '55555555-5555-4555-8555-555555555555',
        registration: 'ADM-2030',
        name: 'Bruno Admin',
      },
    });
  }
  if (method === 'POST' && path === `/v1/funcionarios/${employeeId}/desligamento`) {
    return ok({
      employee: {
        ...employeeRecord(),
        lifecycleStatus: 'TERMINATED',
        functionalStatus: 'DESLIGADO',
      },
    });
  }

  if (method === 'GET' && path === '/v1/auditoria/logs') {
    return ok({
      items: [
        {
          id: 'audit-1',
          occurredAt: '2026-05-03T12:00:00.000Z',
          actorLogin: 'admin.e2e',
          actorSub: 'admin-e2e-sub',
          action: 'CREATE',
          resourceType: 'employee',
          resourceId: employeeId,
          tableName: 'hr.employee',
          requestId: 'req-e2e',
          ipAddress: '127.0.0.1',
          userAgent: 'Playwright',
          statusCode: 201,
          metadata: { redacted: true },
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });
  }
  if (method === 'POST' && path === '/v1/auditoria/exportacoes') {
    return ok({ id: 'audit-report-1', status: 'REQUESTED', requestedAt: '2026-05-03T12:00:00Z' });
  }

  if (method === 'GET' && path === '/v1/ponto/afd/exports') {
    return ok([afdExport('afd-ready')]);
  }
  if (method === 'POST' && path === '/v1/ponto/afd/exports') {
    return ok(afdExport('afd-generated'));
  }
  if (method === 'GET' && path === '/v1/ponto/afd/imports') {
    return ok([
      {
        afdImportId: 'afd-import-ready',
        repDeviceId,
        fileName: 'afd-importado.txt',
        fileSha256: '1234567890abcdef',
        importedAt: '2026-05-03T10:30:00.000Z',
        lineCount: 2,
        status: 'ACCEPTED',
        errorSummary: {},
        objectStoreKey: 'ponto/afd/imports/afd-importado.txt',
        acceptedLines: 2,
        rejectedLines: 0,
      },
    ]);
  }
  if (method === 'POST' && path === '/v1/ponto/afd/imports') {
    return ok({
      afdImportId: 'afd-import-e2e',
      repDeviceId,
      fileName: 'afd-e2e.txt',
      fileSha256: 'fedcba0987654321',
      importedAt: '2026-05-03T11:00:00.000Z',
      lineCount: 1,
      status: 'ACCEPTED',
      errorSummary: {},
      objectStoreKey: 'ponto/afd/imports/afd-e2e.txt',
      acceptedLines: 1,
      rejectedLines: 0,
    });
  }
  if (method === 'GET' && path === '/v1/ponto/afd/exports/afd-ready/download') {
    return {
      status: 200,
      contentType: 'text/plain',
      headers: {
        'content-disposition': 'attachment; filename="afd-ready.txt"',
      },
      body: 'AFD-E2E-DOWNLOAD',
    };
  }

  return ok({});
}

function ok(body: unknown): ApiResponse {
  return { status: 200, body };
}

function monthlyPayrollResult(status: string): Record<string, unknown> {
  return {
    competenceId: 'competence-2026-05',
    payrollRunId: 'payroll-run-2026-05',
    competenceYear: 2026,
    competenceMonth: 5,
    competenceStatus: status,
    payrollStatus: status,
    employeeCount: 1,
    totalEarnings: '6100.00',
    totalDeductions: '667.90',
    totalNet: '5432.10',
    review: [
      {
        employeeId,
        registration: 'ADM-1001',
        employeeName: 'Ana Admin',
        totalEarnings: '6100.00',
        totalDeductions: '667.90',
        netAmount: '5432.10',
      },
    ],
  };
}

function employeeRecord(): Record<string, unknown> {
  return {
    id: employeeId,
    registration: 'ADM-1001',
    name: 'Ana Admin',
    cpf: '11122233344',
    email: 'ana.admin@example.test',
    lifecycleStatus: 'ACTIVE',
    functionalStatus: 'EM_EXERCICIO',
    branch: 'Sede',
    active: true,
    abonoPermanenciaAtivo: false,
    abonoPermanenciaInicio: null,
    abonoPermanenciaFundamento: null,
    recruitmentOrigin: 'CONCURSO',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
  };
}

function afdExport(afdExportId: string): Record<string, unknown> {
  return {
    afdExportId,
    repDeviceId,
    periodStart: '2026-05-01T00:00:00.000Z',
    periodEnd: '2026-05-31T23:59:00.000Z',
    generatedAt: '2026-05-03T10:00:00.000Z',
    fileSha256: 'abcdefabcdefabcdef',
    lineCount: 42,
    requestedByUserId: 'admin-e2e-sub',
    status: 'READY',
    objectStoreKey: `ponto/afd/exports/${afdExportId}.txt`,
    errorSummary: {},
  };
}
