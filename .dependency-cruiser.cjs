const recommendedStrict = require('./node_modules/dependency-cruiser/configs/recommended-strict.cjs');

const acceptedStrictBaseline = {
  frontendModelOrphans:
    '^frontend/src/app/core/models/(?:route-permission|navigation-item|domain-action)\\.ts$',
  stynxFrontendAliases:
    '^(?:@sgp/shared(?:/stynx-runtime-config)?|@sgp/shared-platform/(?:filter-bar|crud-table))$',
  supertestTypes: '^supertest/types$',
  angularAuthOidcBundle:
    '^node_modules/angular-auth-oidc-client/fesm2022/angular-auth-oidc-client\\.mjs$',
  consignmentPortabilityCycle:
    '^backend/src/integrations-worker/consignment-portability/(?:portability-parser\\.service|adapters/(?:bank-x|bank-y))\\.ts$',
};

const strictRules = recommendedStrict.forbidden.map((rule) => {
  if (rule.name === 'no-orphans') {
    return {
      ...rule,
      from: {
        ...rule.from,
        pathNot: [rule.from.pathNot, acceptedStrictBaseline.frontendModelOrphans].join('|'),
      },
    };
  }

  if (rule.name === 'not-to-unresolvable') {
    return {
      ...rule,
      to: {
        ...rule.to,
        pathNot: [
          acceptedStrictBaseline.stynxFrontendAliases,
          acceptedStrictBaseline.supertestTypes,
        ].join('|'),
      },
    };
  }

  if (rule.name === 'no-non-package-json') {
    return {
      ...rule,
      to: {
        ...rule.to,
        pathNot: acceptedStrictBaseline.angularAuthOidcBundle,
      },
    };
  }

  if (rule.name === 'no-circular') {
    return {
      ...rule,
      to: {
        ...rule.to,
        pathNot: acceptedStrictBaseline.consignmentPortabilityCycle,
      },
    };
  }

  return rule;
});

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

// Accepted legacy backend feature edges discovered before the module-graph gate
// was introduced. New direct feature-to-feature imports must use shared/core
// boundaries or be documented here intentionally.
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

function frontendFeaturePath(featureName) {
  return `^frontend/src/app/features/${featureName}(?:/|$)`;
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

const frontendFeatureModules = [
  'admin',
  'admin-feature',
  'auditoria',
  'avaliacao',
  'convenio',
  'fiscal',
  'folha-pagamento',
  'gestao',
  'portal',
  'portal-empregado',
  'portal-publico',
  'portal-transparencia',
  'ponto',
  'publico',
  'recrutamento',
  'relatorio',
  'rh',
  'saude',
  'security',
  'tce',
];

// Accepted legacy frontend feature edges discovered before the module-graph gate
// was introduced. These stay explicit so new sibling feature imports fail until
// the boundary is redesigned or the edge is intentionally documented.
const existingFrontendFeatureEdges = [
  ['convenio', 'admin-feature', 'legacy navigation card reuse'],
  ['folha-pagamento', 'gestao', 'legacy master-data page integration'],
  ['gestao', 'admin', 'legacy parameter entry point reuse'],
  ['portal', 'folha-pagamento', 'legacy employee payroll page reuse'],
  ['portal', 'ponto', 'legacy employee time page reuse'],
  ['portal-empregado', 'ponto', 'legacy employee time page reuse'],
  ['relatorio', 'admin-feature', 'legacy generic report shell reuse'],
];

const existingFrontendFeatureEdgeNames = new Set(
  existingFrontendFeatureEdges.map(([from, to]) => `${from}->${to}`),
);

const frontendFeatureEdgeRules = frontendFeatureModules.flatMap((fromFeature) =>
  frontendFeatureModules
    .filter((toFeature) => toFeature !== fromFeature)
    .filter(
      (toFeature) => !existingFrontendFeatureEdgeNames.has(`${fromFeature}->${toFeature}`),
    )
    .map((toFeature) => ({
      name: `no-frontend-feature-sibling-import:${fromFeature}->${toFeature}`,
      comment:
        'Frontend feature modules must not import sibling features directly. Move shared behavior to app/core, app/shared, or app/shared-platform before depending on it.',
      severity: 'error',
      from: { path: frontendFeaturePath(fromFeature) },
      to: { path: frontendFeaturePath(toFeature) },
    })),
);

module.exports = {
  ...recommendedStrict,
  forbidden: [
    ...strictRules,
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
    ...frontendFeatureEdgeRules,
  ],
  options: {
    ...recommendedStrict.options,
    doNotFollow: {
      ...recommendedStrict.options.doNotFollow,
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
