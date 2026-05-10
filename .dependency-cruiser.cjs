const featureModules = [
  'avaliacao',
  'consultas',
  'convenio',
  'det',
  'documents',
  'esocial-events',
  'external',
  'folha-pagamento',
  'gestao',
  'health',
  'integrations',
  'integrations-worker',
  'lgpd',
  'notifications',
  'payroll-engine',
  'ponto',
  'portal',
  'previdenciario',
  'profiles',
  'publico',
  'recrutamento',
  'relatorio',
  'report-service',
  'reports',
  'rh',
  'saude',
  'system-parameters',
  'tce',
  'users',
];

const sharedModules = ['common', 'database'];

const existingFeatureEdges = [
  ['avaliacao', 'rh'],
  ['consultas', 'folha-pagamento'],
  ['consultas', 'rh'],
  ['convenio', 'integrations'],
  ['documents', 'portal'],
  ['det', 'integrations'],
  ['esocial-events', 'integrations'],
  ['external', 'tce'],
  ['folha-pagamento', 'integrations'],
  ['folha-pagamento', 'integrations-worker'],
  ['folha-pagamento', 'payroll-engine'],
  ['folha-pagamento', 'rh'],
  ['folha-pagamento', 'system-parameters'],
  ['folha-pagamento', 'tce'],
  ['gestao', 'integrations'],
  ['integrations', 'esocial-events'],
  ['integrations-worker', 'documents'],
  ['integrations-worker', 'external'],
  ['integrations-worker', 'folha-pagamento'],
  ['integrations-worker', 'integrations'],
  ['integrations-worker', 'recrutamento'],
  ['integrations-worker', 'report-service'],
  ['lgpd', 'portal'],
  ['lgpd', 'publico'],
  ['portal', 'avaliacao'],
  ['portal', 'documents'],
  ['portal', 'external'],
  ['portal', 'report-service'],
  ['portal', 'rh'],
  ['portal', 'saude'],
  ['ponto', 'integrations'],
  ['previdenciario', 'integrations'],
  ['previdenciario', 'rh'],
  ['profiles', 'convenio'],
  ['publico', 'portal'],
  ['publico', 'rh'],
  ['recrutamento', 'external'],
  ['recrutamento', 'integrations'],
  ['recrutamento', 'rh'],
  ['relatorio', 'report-service'],
  ['report-service', 'documents'],
  ['report-service', 'external'],
  ['report-service', 'folha-pagamento'],
  ['report-service', 'integrations-worker'],
  ['report-service', 'rh'],
  ['reports', 'rh'],
  ['rh', 'consultas'],
  ['rh', 'integrations'],
  ['rh', 'previdenciario'],
  ['saude', 'integrations'],
  ['saude', 'rh'],
  ['system-parameters', 'integrations-worker'],
  ['tce', 'external'],
  ['tce', 'integrations-worker'],
];

function backendModulePath(moduleName) {
  return `^backend/src/${moduleName}(?:/|$)`;
}

const existingFeatureEdgeNames = new Set(
  existingFeatureEdges.map(([from, to]) => `${from}->${to}`),
);

const featureEdgeRules = featureModules.flatMap((fromModule) =>
  featureModules
    .filter((toModule) => toModule !== fromModule)
    .filter((toModule) => !existingFeatureEdgeNames.has(`${fromModule}->${toModule}`))
    .map((toModule) => ({
      name: `no-direct-feature-import:${fromModule}->${toModule}`,
      comment:
        'Feature modules must not take new direct dependencies on each other. Use a shared/core boundary and document accepted legacy edges before allowing them.',
      severity: 'error',
      from: { path: backendModulePath(fromModule) },
      to: { path: backendModulePath(toModule) },
    })),
);

module.exports = {
  forbidden: [
    {
      name: 'no-shared-to-feature',
      comment: 'Shared backend layers must not depend on feature modules.',
      severity: 'error',
      from: {
        path: `^backend/src/(?:${sharedModules.join('|')})(?:/|$)`,
        pathNot: '\\.spec\\.ts$',
      },
      to: { path: `^backend/src/(?:${featureModules.join('|')})(?:/|$)` },
    },
    {
      name: 'no-frontend-portal-imports-from-admin',
      comment: 'The admin Angular app must not import portal app internals.',
      severity: 'error',
      from: { path: '^frontend/src/' },
      to: { path: '^frontend/portal/src/' },
    },
    ...featureEdgeRules,
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: [
        '^backend/dist/',
        '^backend/coverage/',
        '^frontend/dist/',
        '^frontend/coverage/',
        '^tests/',
      ].join('|'),
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      conditionNames: ['import', 'require', 'node', 'default'],
      exportsFields: ['exports'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      mainFields: ['module', 'main', 'types'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
    },
  },
};
