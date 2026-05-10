import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { ApiClient } from '../api/api-client';
import { OpenApiClient } from '../api/openapi-client';
import { PORTAL_FEATURE_CATALOG } from './portal-feature-catalog';
import { PORTAL_ROUTE_ENDPOINTS, portalEndpointForPath } from './portal-route-endpoints';

const catalogPaths = PORTAL_FEATURE_CATALOG.flatMap((section) =>
  section.items.map((item) => item.path),
);

describe('portal route endpoint wiring', () => {
  it('keeps one endpoint loader for every catalog route', () => {
    expect(catalogPaths.length).toBeGreaterThanOrEqual(33);
    expect(PORTAL_ROUTE_ENDPOINTS.map((endpoint) => endpoint.path).sort()).toEqual(
      [...catalogPaths].sort(),
    );
  });

  it.each(catalogPaths)('loads backend data for %s', async (path) => {
    const clients = createClients();
    const endpoint = portalEndpointForPath(path);

    await firstValueFrom(
      endpoint.load({ api: clients.api as unknown as ApiClient, openApi: clients.openApi }),
    );

    const openApiCalls = Object.values(clients.openApi as unknown as Record<string, Mock>).reduce(
      (total, method) => total + method.mock.calls.length,
      0,
    );
    expect(openApiCalls + clients.api.get.mock.calls.length).toBeGreaterThan(0);
    expect(endpoint.endpoint).toMatch(/^GET \/api\//);
  });

  it('normalizes paths and falls back for unmapped routes', async () => {
    const clients = createClients();
    const normalized = portalEndpointForPath('contracheques/atual/');
    const fallback = portalEndpointForPath('rota/desconhecida/');

    await firstValueFrom(
      normalized.load({ api: clients.api as unknown as ApiClient, openApi: clients.openApi }),
    );
    await firstValueFrom(
      fallback.load({ api: clients.api as unknown as ApiClient, openApi: clients.openApi }),
    );

    expect(normalized.path).toBe('/contracheques/atual');
    expect(fallback.path).toBe('/rota/desconhecida');
    expect(fallback.contractStatus).toBe('fallback');
    expect(clients.openApi.getApiPortalV1AuthMe).toHaveBeenCalled();
  });

  it('rejects fallback employee routes when the portal profile has no employee id', async () => {
    const clients = createClients({ employeeId: '' });
    const endpoint = portalEndpointForPath('/licencas/solicitacoes');

    await expect(
      firstValueFrom(
        endpoint.load({ api: clients.api as unknown as ApiClient, openApi: clients.openApi }),
      ),
    ).rejects.toThrow('Portal profile endpoint did not return an employee id.');
    expect(clients.api.get).not.toHaveBeenCalled();
  });
});

function createClients({ employeeId = 'employee-1' }: { employeeId?: unknown } = {}): {
  api: ApiClientMock;
  openApi: OpenApiClient;
} {
  const api: ApiClientMock = {
    get: vi.fn(() => of([])),
  };
  const openApi = {
    getApiPortalV1AuthGovbrStatus: vi.fn(() => of({ status: 'available' })),
    getApiPortalV1AuthMe: vi.fn(() => of({ authenticated: true })),
    getApiV1AuthMe: vi.fn(() => of({ username: 'portal.user' })),
    getApiV1AuthMenus: vi.fn(() => of([])),
    getApiV1AvaliacaoDesempenhos: vi.fn(() => of([])),
    getApiV1AvaliacaoProgressionEligibility: vi.fn(() => of({ eligible: true })),
    getApiV1PortalContrachequeByCompetence: vi.fn(() => of({ competence: '2026-05' })),
    getApiV1PortalMeusDadosCadastro: vi.fn(() => of({ id: employeeId, name: 'Servidor Um' })),
    getApiV1PortalMeusDadosCargo: vi.fn(() => of({ cargo: 'Analista' })),
    getApiV1PortalMeusDadosContato: vi.fn(() => of({ email: 'portal@example.test' })),
    getApiV1PortalMeusDadosDependentes: vi.fn(() => of([])),
    getApiV1PortalMeusDadosDocumentos: vi.fn(() => of([])),
    getApiV1PortalMeusDadosEndereco: vi.fn(() => of({ city: 'Recife' })),
    getApiV1PortalMinhaCarreira: vi.fn(() => of({ trail: [] })),
    getApiV1PortalPayslips: vi.fn(() => of([])),
    getApiV1PortalYearlyIncome: vi.fn(() => of([])),
  } as unknown as OpenApiClient;

  return { api, openApi };
}

interface ApiClientMock {
  get: Mock;
}
