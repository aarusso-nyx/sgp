import playwright, { type Page } from '@playwright/test';

const { expect, test } = playwright;

interface ApiHit {
  method: string;
  path: string;
  authorization: string;
  requestId: string;
  tenantId: string;
}

interface CatalogLink {
  href: string;
  label: string;
  path: string;
}

const employeeId = '11111111-1111-4111-8111-111111111111';

const SPECIALIZED_PORTAL_ROUTES = new Set([
  '/aprovacoes',
  '/certificacoes',
  '/contracheques/atual',
  '/contracheques/download/competencia-atual',
  '/contracheques/financeiro-anual',
  '/contracheques/historico',
  '/documentos/certidoes',
  '/documentos/declaracoes',
  '/documentos/ficha-funcional',
  '/documentos/solicitar',
  '/ferias/historico',
  '/ferias/programacao',
  '/ferias/solicitar',
  '/licencas/documentos',
  '/licencas/historico',
  '/licencas/saude/solicitar',
  '/licencas/solicitacoes',
  '/meus-dados/cadastro',
  '/meus-dados/contato',
  '/meus-dados/dependentes',
  '/meus-dados/documentos',
  '/meus-dados/endereco',
  '/minha-equipe',
  '/pdi',
  '/ponto/proximas-escalas',
]);

test.describe('SGP portal Playwright e2e', () => {
  test('redirects anonymous users to the Cognito login boundary', async ({ page }) => {
    await bootPortal(page, { authenticated: false });

    await page.goto('/');

    await expect(page).toHaveURL(/idp\.test\/oauth2\/authorize/);
    const loginUrl = new URL(page.url());
    expect(loginUrl.searchParams.get('client_id')).toBe('portal-client');
    expect(loginUrl.searchParams.get('response_type')).toBe('code');
    expect(loginUrl.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:4310/auth/callback');
  });

  test('renders the authenticated dashboard with the live route catalog', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootPortal(page, { hits });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Portal surface aligned/ })).toBeVisible();
    await expect(page.locator('.section-grid a')).toHaveCount(38);
    await expect(page.getByText('portal journeys mapped')).toBeVisible();
    expect(hits).toContainEqual(
      expect.objectContaining({
        method: 'GET',
        path: '/v1/portal/meus-dados/cargo',
        authorization: 'Bearer portal-e2e-token',
        requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        tenantId: employeeId,
      }),
    );
  });

  test('renders every catalog route without leaving a blank portal surface', async ({ page }) => {
    await bootPortal(page);

    await page.goto('/');
    const routes = await catalogLinks(page);
    expect(routes).toHaveLength(38);

    for (const route of routes) {
      await page.locator(`a[href="${route.path}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${route.path}$`));
      await expect(page.locator('main.content section').first()).toBeVisible();

      if (!SPECIALIZED_PORTAL_ROUTES.has(route.path)) {
        await expect(page.locator('section.feature-sheet')).toBeVisible();
        await expect(page.getByText(route.path, { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: route.label })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Backend data' })).toBeVisible();
      }
    }
  });

  test('loads the current contracheque workflow from the portal API', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootPortal(page, { hits });

    await page.goto('/contracheque/2026-05');

    await expect(page.getByRole('heading', { name: 'Contracheque' })).toBeVisible();
    await expect
      .poll(() => hits.some((hit) => hit.path === '/v1/portal/contracheque/2026-05'))
      .toBe(true);
  });

  test('keeps the annual finance catalog route on the current contracheque workflow', async ({
    page,
  }) => {
    const hits: ApiHit[] = [];
    await bootPortal(page, { hits });

    await page.goto('/contracheques/financeiro-anual');

    await expect(page.getByRole('heading', { name: 'Contracheque' })).toBeVisible();
    await expect
      .poll(() => hits.some((hit) => /^\/v1\/portal\/contracheque\/\d{4}-\d{2}$/.test(hit.path)))
      .toBe(true);
  });

  test('loads the ponto consultation surface for upcoming schedules', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootPortal(page, { hits });

    await page.goto('/ponto/proximas-escalas');

    await expect(page.getByRole('heading', { name: 'Proximas escalas' })).toBeVisible();
    await expect
      .poll(() => hits.some((hit) => hit.path === '/v1/ponto/escalas/proximas'))
      .toBe(true);
  });

  test('loads the ferias request route with the current fallback balance contract', async ({
    page,
  }) => {
    const hits: ApiHit[] = [];
    await bootPortal(page, { hits });

    await page.goto('/ferias/solicitar');

    await expect(page.getByRole('heading', { name: 'Ferias' })).toBeVisible();
    await page.getByPlaceholder('UUID do servidor').fill(employeeId);
    await page.getByRole('button', { name: 'Saldo' }).click();
    await expect
      .poll(() => hits.some((hit) => hit.path === `/v1/ferias/saldo/${employeeId}`))
      .toBe(true);
    await expect(page.getByText('30 dias')).toBeVisible();
  });

  test('loads dependents as an authenticated portal data workflow', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootPortal(page, { hits });

    await page.goto('/meus-dados/dependentes');

    await expect(page.getByRole('heading', { name: 'Meus Dados' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'dependentes' })).toBeVisible();
    await expect
      .poll(() => hits.some((hit) => hit.path === '/v1/portal/meus-dados/dependentes'))
      .toBe(true);
  });

  test('loads cadastral profile data for the change-request workflow source', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootPortal(page, { hits });

    await page.goto('/meus-dados/cadastro');

    await expect(page.getByRole('heading', { name: 'Meus Dados' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'cadastro' })).toBeVisible();
    await expect
      .poll(() => hits.some((hit) => hit.path === '/v1/portal/meus-dados/cadastro'))
      .toBe(true);
  });

  test('loads notifications through the authenticated notification endpoint', async ({ page }) => {
    const hits: ApiHit[] = [];
    await bootPortal(page, { hits });

    await page.goto('/notificacoes');

    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    await expect(page.getByText('GET /api/v1/notificacoes')).toBeVisible();
    await expect.poll(() => hits.some((hit) => hit.path === '/v1/notificacoes')).toBe(true);
  });

  test('keeps margin routes outside the current portal catalog instead of shimming them', async ({
    page,
  }) => {
    await bootPortal(page);

    await page.goto('/');
    const routes = await catalogLinks(page);

    expect(routes.some((route) => /margem|consign/i.test(`${route.label} ${route.path}`))).toBe(
      false,
    );
    await page.goto('/margem-consignavel');
    await expect(page.getByRole('heading', { name: /Portal surface aligned/ })).toBeVisible();
  });

  test('keeps transparency routes outside the current portal catalog instead of shimming them', async ({
    page,
  }) => {
    await bootPortal(page);

    await page.goto('/');
    const routes = await catalogLinks(page);

    expect(routes.some((route) => /transpar/i.test(`${route.label} ${route.path}`))).toBe(false);
    await page.goto('/transparencia');
    await expect(page.getByRole('heading', { name: /Portal surface aligned/ })).toBeVisible();
  });
});

async function bootPortal(
  page: Page,
  options: { authenticated?: boolean; hits?: ApiHit[] } = {},
): Promise<void> {
  const authenticated = options.authenticated ?? true;

  await page.addInitScript(
    ({ isAuthenticated, sessionEmployeeId }) => {
      (window as unknown as { SGP_CONFIG: Record<string, string> }).SGP_CONFIG = {
        API_BASE_PATH: '/api',
        COGNITO_CLIENT_ID: 'portal-client',
        COGNITO_DOMAIN: 'https://idp.test',
        COGNITO_REDIRECT_URI: 'http://127.0.0.1:4310/auth/callback',
        STYNX_E2E: 'true',
        TENANT_ID: sessionEmployeeId,
      };

      if (isAuthenticated) {
        (
          window as unknown as { SGP_CONFIG: Record<string, string> }
        ).SGP_CONFIG.STYNX_E2E_ACCESS_TOKEN = 'portal-e2e-token';
      } else {
        sessionStorage.clear();
      }
    },
    { isAuthenticated: authenticated, sessionEmployeeId: employeeId },
  );

  await page.route('https://idp.test/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Portal login boundary</title>',
    });
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();
    options.hits?.push({
      method,
      path,
      authorization: request.headers()['authorization'] ?? '',
      requestId: request.headers()['x-request-id'] ?? '',
      tenantId: request.headers()['x-tenant-id'] ?? '',
    });

    const response = responseFor(method, path);
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
}

async function catalogLinks(page: Page): Promise<CatalogLink[]> {
  await expect(page.locator('.section-grid a').first()).toBeVisible();
  return page.locator('.section-grid a').evaluateAll((anchors) =>
    anchors.map((anchor) => {
      const link = anchor as HTMLAnchorElement;
      return {
        href: link.href,
        label: link.textContent?.trim() ?? '',
        path: new URL(link.href).pathname,
      };
    }),
  );
}

function responseFor(method: string, path: string): { status: number; body: unknown } {
  if (method === 'PUT' && path.startsWith('/v1/portal/meus-dados/')) {
    return ok({ status: 'submitted' });
  }
  if (method === 'POST' && path === '/v1/ferias/programacao') {
    return ok([
      {
        id: 'vacation-1',
        startsOn: '2026-07-01',
        endsOn: '2026-07-30',
        days: 30,
        status: 'REQUESTED',
        installmentNumber: 1,
        pecuniaryBonusDays: 0,
      },
    ]);
  }
  if (method === 'POST' && path === '/v1/licencas') {
    return ok({
      id: 'leave-1',
      reason: 'maternidade',
      startsOn: '2026-06-01',
      endsOn: '2026-09-28',
      days: 120,
      paid: true,
      status: 'REQUESTED',
    });
  }
  if (method === 'POST' && path === '/v1/licencas/saude/agendamento') {
    return ok({ id: 'medical-appointment-1', status: 'REQUESTED' });
  }

  if (path === '/portal/v1/auth/govbr/status') {
    return ok({ enabled: true, level: 'advanced' });
  }
  if (path === '/portal/v1/auth/me') {
    return ok({ username: 'portal.e2e', employeeId });
  }
  if (path === '/v1/auth/me') {
    return ok({ username: 'portal.e2e', employeeId });
  }
  if (path === '/v1/auth/menus') {
    return ok([{ id: 'portal', label: 'Portal' }]);
  }
  if (path === '/v1/portal/meus-dados/cargo') {
    return ok({
      cargo: 'Analista Previdenciario',
      codigoCargo: 'AP-01',
      classe: 2,
      nivel: 5,
      vencimentoBasico: '5.000,00',
    });
  }
  if (path === '/v1/portal/meus-dados/cadastro') {
    return ok({
      id: employeeId,
      socialName: 'Ana Portal',
      rg: 'MG-12.345.678',
      pisPasep: '12345678901',
      motherName: 'Maria Portal',
    });
  }
  if (path === '/v1/portal/meus-dados/endereco') {
    return ok({ street: 'Rua Central', number: '100', city: 'Sao Paulo', zipCode: '01000-000' });
  }
  if (path === '/v1/portal/meus-dados/contato') {
    return ok({
      email: 'ana.portal@example.test',
      phone: '+55 11 99999-0000',
      alternatePhone: '',
      preferredChannel: 'email',
    });
  }
  if (path === '/v1/portal/meus-dados/dependentes') {
    return ok([
      { id: 'dependent-1', name: 'Lia Portal', relationship: 'Filha' },
      { id: 'dependent-2', name: 'Theo Portal', relationship: 'Filho' },
    ]);
  }
  if (path === '/v1/portal/meus-dados/documentos') {
    return ok([{ id: 'doc-1', fileName: 'RG.pdf', contentType: 'application/pdf' }]);
  }
  if (path === '/v1/portal/minha-carreira') {
    return ok([{ event: 'Posse', date: '2020-01-10' }]);
  }
  if (/^\/v1\/portal\/contracheque\/\d{4}-\d{2}$/.test(path)) {
    const competence = path.split('/').at(-1) ?? '2026-05';
    return ok({
      payrollRunId: `run-${competence}`,
      competence,
      status: 'FECHADO',
      employee: { registration: '100200', name: 'Ana Portal' },
      totals: { earnings: '6.100,00', deductions: '667,90', net: '5.432,10' },
      lines: [
        { code: '001', description: 'Vencimento base', kind: 'EARNING', amount: '5.000,00' },
        { code: '310', description: 'RPPS', kind: 'DEDUCTION', amount: '667,90' },
      ],
      html: '<section>Contracheque</section>',
    });
  }
  if (path === '/v1/portal/payslips') {
    return ok([{ id: 'paystub-2026-05', competence: '2026-05', status: 'FECHADO' }]);
  }
  if (path === '/v1/portal/yearly-income') {
    return ok([{ id: 'income-2025', yearBase: 2025, status: 'AVAILABLE' }]);
  }
  if (path === '/v1/portal/termos-rescisao') {
    return ok([{ id: 'termination-1', status: 'NONE' }]);
  }
  if (path.startsWith('/v1/licencas/saude/')) {
    return ok([
      {
        id: 'medical-1',
        grantedDays: 7,
        startsOn: '2026-05-10',
        endsOn: '2026-05-16',
        status: 'AGENDADA',
        cidCode: 'Z00',
      },
    ]);
  }
  if (path.startsWith('/v1/licencas/')) {
    return ok([
      {
        id: 'leave-1',
        reason: 'maternidade',
        startsOn: '2026-06-01',
        endsOn: '2026-09-28',
        days: 120,
        paid: true,
        status: 'REQUESTED',
      },
    ]);
  }
  if (path.startsWith('/v1/ferias/saldo/')) {
    return ok([
      {
        accrualPeriodStart: '2025-01-01',
        accrualPeriodEnd: '2025-12-31',
        accruedDays: 30,
        usedDays: 0,
        pecuniaryBonusDays: 0,
        availableDays: 30,
      },
    ]);
  }
  if (path === '/v1/previdenciario/recadastramentos/pendencias') {
    return ok([{ id: 'recad-1', status: 'PENDING' }]);
  }
  if (path === '/v1/previdenciario/recadastramentos/historico') {
    return ok([{ id: 'recad-2025', status: 'APPROVED' }]);
  }
  if (path === '/v1/previdenciario/declaracoes') {
    return ok([{ id: 'decl-1', type: 'DECLARACAO_VINCULO' }]);
  }
  if (path === '/v1/previdenciario/certidoes-tempo') {
    return ok([{ id: 'ctc-1', status: 'AVAILABLE' }]);
  }
  if (path === '/v1/recrutamento/concursos') {
    return ok([{ id: 'concurso-1', title: 'Processo seletivo interno' }]);
  }
  if (path === '/v1/avaliacao/desempenhos') {
    return ok([{ id: 'avaliacao-1', cycle: '2026' }]);
  }
  if (path === '/v1/avaliacao/progression/eligibility') {
    return ok([{ id: 'progression-1', eligible: true }]);
  }
  if (path === '/v1/notificacoes') {
    return ok([{ id: 'notice-1', title: 'Recadastramento aberto', read: false }]);
  }
  if (path === '/v1/ponto/escalas/proximas') {
    return ok([
      {
        workDate: '2026-05-04',
        expectedEntry: '2026-05-04T22:00:00.000Z',
        expectedExit: '2026-05-05T06:00:00.000Z',
        expectedMinutes: 480,
        nightShiftFlag: true,
        hazardFlag: false,
      },
    ]);
  }

  return ok({ method, path, ok: true });
}

function ok(body: unknown): { status: number; body: unknown } {
  return { status: 200, body };
}
