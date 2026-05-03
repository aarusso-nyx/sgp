import { Observable, forkJoin, map, switchMap } from 'rxjs';

import { ApiClient } from '../api/api-client';
import { OpenApiClient } from '../api/generated/openapi-client';

export interface PortalRouteClients {
  api: ApiClient;
  openApi: OpenApiClient;
}

export interface PortalRouteEndpoint {
  path: string;
  endpoint: string;
  contractStatus: 'direct' | 'fallback';
  gap: string;
  load: (clients: PortalRouteClients) => Observable<unknown>;
}

type EndpointLoader = PortalRouteEndpoint['load'];

function ownEmployeeId(openApi: OpenApiClient): Observable<string> {
  return openApi.getApiV1PortalMeusDadosCadastro().pipe(
    map((profile) => {
      const id = (profile as { id?: unknown } | null)?.id;
      if (typeof id === 'string' && id.trim()) {
        return id;
      }
      throw new Error('Portal profile endpoint did not return an employee id.');
    }),
  );
}

function direct(path: string, endpoint: string, load: EndpointLoader): PortalRouteEndpoint {
  return {
    path,
    endpoint,
    contractStatus: 'direct',
    gap: '',
    load,
  };
}

function fallback(
  path: string,
  endpoint: string,
  gap: string,
  load: EndpointLoader,
): PortalRouteEndpoint {
  return {
    path,
    endpoint,
    contractStatus: 'fallback',
    gap,
    load,
  };
}

function ownLeaves(path: string): PortalRouteEndpoint {
  return fallback(
    path,
    'GET /api/v1/licencas/:employee_id',
    'No self-service /api/v1/portal/licencas endpoint exists yet; this uses the existing employee leave endpoint scoped from the portal profile id.',
    ({ api, openApi }) =>
      ownEmployeeId(openApi).pipe(switchMap((id) => api.get(`v1/licencas/${id}`))),
  );
}

function ownMedicalLeaves(path: string): PortalRouteEndpoint {
  return fallback(
    path,
    'GET /api/v1/licencas/saude/:employee_id',
    'No self-service /api/v1/portal/pericias endpoint exists yet; this uses the existing medical leave endpoint scoped from the portal profile id.',
    ({ api, openApi }) =>
      ownEmployeeId(openApi).pipe(switchMap((id) => api.get(`v1/licencas/saude/${id}`))),
  );
}

function ownVacationBalance(path: string): PortalRouteEndpoint {
  return fallback(
    path,
    'GET /api/v1/ferias/saldo/:employee_id',
    'No self-service /api/v1/portal/ferias endpoint exists yet; this uses the existing vacation balance endpoint scoped from the portal profile id.',
    ({ api, openApi }) =>
      ownEmployeeId(openApi).pipe(switchMap((id) => api.get(`v1/ferias/saldo/${id}`))),
  );
}

export const PORTAL_ROUTE_ENDPOINTS: PortalRouteEndpoint[] = [
  direct('/meus-dados/cadastro', 'GET /api/v1/portal/meus-dados/cadastro', ({ openApi }) =>
    openApi.getApiV1PortalMeusDadosCadastro(),
  ),
  direct('/meus-dados/endereco', 'GET /api/v1/portal/meus-dados/endereco', ({ openApi }) =>
    openApi.getApiV1PortalMeusDadosEndereco(),
  ),
  direct('/meus-dados/contato', 'GET /api/v1/portal/meus-dados/contato', ({ openApi }) =>
    openApi.getApiV1PortalMeusDadosContato(),
  ),
  direct('/meus-dados/documentos', 'GET /api/v1/portal/meus-dados/documentos', ({ openApi }) =>
    openApi.getApiV1PortalMeusDadosDocumentos(),
  ),
  direct('/meus-dados/dependentes', 'GET /api/v1/portal/meus-dados/dependentes', ({ openApi }) =>
    openApi.getApiV1PortalMeusDadosDependentes(),
  ),
  direct('/contracheques/atual', 'GET /api/v1/portal/contracheque/:competence', ({ openApi }) =>
    openApi.getApiV1PortalContrachequeByCompetence({ competence: currentCompetence() }),
  ),
  direct('/contracheques/historico', 'GET /api/v1/portal/payslips', ({ openApi }) =>
    openApi.getApiV1PortalPayslips(),
  ),
  direct(
    '/contracheques/download/competencia-atual',
    'GET /api/v1/portal/payslips',
    ({ openApi }) => openApi.getApiV1PortalPayslips(),
  ),
  direct('/contracheques/financeiro-anual', 'GET /api/v1/portal/yearly-income', ({ openApi }) =>
    openApi.getApiV1PortalYearlyIncome(),
  ),
  ownLeaves('/licencas/solicitacoes'),
  ownLeaves('/licencas/historico'),
  ownLeaves('/licencas/documentos'),
  ownMedicalLeaves('/licencas/saude/solicitar'),
  ownMedicalLeaves('/pericias/agendadas'),
  ownMedicalLeaves('/pericias/historico'),
  ownMedicalLeaves('/pericias/anexos'),
  fallback(
    '/recadastramento/iniciar',
    'GET /api/v1/previdenciario/recadastramentos/pendencias',
    'No self-service recadastramento start endpoint exists yet; this reads the existing recadastramento pending-work surface.',
    ({ api }) => api.get('v1/previdenciario/recadastramentos/pendencias'),
  ),
  fallback(
    '/recadastramento/historico',
    'GET /api/v1/previdenciario/recadastramentos/historico',
    'No self-service recadastramento history endpoint exists yet; this reads the existing previdenciario history surface.',
    ({ api }) => api.get('v1/previdenciario/recadastramentos/historico'),
  ),
  fallback(
    '/recadastramento/comprovantes',
    'GET /api/v1/previdenciario/recadastramentos/historico',
    'No self-service receipt index endpoint exists yet; this reads recadastramento history until a portal receipt route is added.',
    ({ api }) => api.get('v1/previdenciario/recadastramentos/historico'),
  ),
  ownVacationBalance('/ferias/solicitar'),
  ownVacationBalance('/ferias/historico'),
  ownVacationBalance('/ferias/programacao'),
  fallback(
    '/curriculo/meu-curriculo',
    'GET /api/v1/recrutamento/concursos',
    'No candidate/employee curriculum portal endpoint exists yet; this reads the existing recruitment catalog surface.',
    ({ api }) => api.get('v1/recrutamento/concursos'),
  ),
  fallback(
    '/curriculo/candidaturas',
    'GET /api/v1/recrutamento/concursos',
    'No own-applications portal endpoint exists yet; this reads the existing recruitment catalog surface.',
    ({ api }) => api.get('v1/recrutamento/concursos'),
  ),
  fallback(
    '/requisicoes/nova',
    'GET /api/v1/auth/me',
    'No staffing-request draft/read portal endpoint exists yet; this route verifies the authenticated manager context only.',
    ({ openApi }) => openApi.getApiV1AuthMe(),
  ),
  fallback(
    '/requisicoes/acompanhamento',
    'GET /api/v1/auth/menus',
    'No staffing-request tracking endpoint exists yet; this route verifies available authenticated menu context only.',
    ({ openApi }) => openApi.getApiV1AuthMenus(),
  ),
  direct('/documentos/ficha-funcional', 'GET /api/v1/portal/meus-dados/cargo', ({ openApi }) =>
    forkJoin({
      cadastro: openApi.getApiV1PortalMeusDadosCadastro(),
      cargo: openApi.getApiV1PortalMeusDadosCargo(),
      carreira: openApi.getApiV1PortalMinhaCarreira(),
    }),
  ),
  fallback(
    '/documentos/declaracoes',
    'GET /api/v1/previdenciario/declaracoes',
    'No self-service declarations endpoint exists yet; this reads the existing previdenciario declarations surface.',
    ({ api }) => api.get('v1/previdenciario/declaracoes'),
  ),
  fallback(
    '/documentos/certidoes',
    'GET /api/v1/previdenciario/certidoes-tempo',
    'No self-service certificates endpoint exists yet; this reads the existing previdenciario certificate surface.',
    ({ api }) => api.get('v1/previdenciario/certidoes-tempo'),
  ),
  direct('/avaliacao/auto-avaliacao', 'GET /api/v1/avaliacao/desempenhos', ({ openApi }) =>
    openApi.getApiV1AvaliacaoDesempenhos(),
  ),
  direct('/avaliacao/resultados', 'GET /api/v1/avaliacao/progression/eligibility', ({ openApi }) =>
    openApi.getApiV1AvaliacaoProgressionEligibility(),
  ),
  fallback(
    '/notificacoes',
    'GET /api/v1/notificacoes',
    'No /api/v1/portal/notificacoes alias exists yet; this reads the existing authenticated notifications endpoint.',
    ({ api }) => api.get('v1/notificacoes'),
  ),
  direct('/configuracoes/mfa', 'GET /api/portal/v1/auth/govbr/status', ({ openApi }) =>
    openApi.getApiPortalV1AuthGovbrStatus(),
  ),
  direct('/configuracoes/senha', 'GET /api/v1/auth/me', ({ openApi }) => openApi.getApiV1AuthMe()),
  fallback(
    '/configuracoes/lgpd',
    'GET /api/portal/v1/auth/me',
    'LGPD rights currently expose POST /api/portal/v1/lgpd/direitos only; there is no read endpoint for consent/privacy history yet.',
    ({ openApi }) => openApi.getApiPortalV1AuthMe(),
  ),
];

export function portalEndpointForPath(path: string): PortalRouteEndpoint {
  const normalized = normalizePath(path);
  const endpoint = PORTAL_ROUTE_ENDPOINTS.find((item) => item.path === normalized);
  if (!endpoint) {
    return fallback(
      normalized,
      'GET /api/portal/v1/auth/me',
      'No route-specific endpoint mapping exists yet; this route only verifies the authenticated portal actor.',
      ({ openApi }) => openApi.getApiPortalV1AuthMe(),
    );
  }
  return endpoint;
}

function normalizePath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.replace(/\/$/, '');
}

function currentCompetence(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}
