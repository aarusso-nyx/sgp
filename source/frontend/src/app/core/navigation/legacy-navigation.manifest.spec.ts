import {
  LEGACY_MODULE_ROUTES,
  LEGACY_NAVIGATION_MANIFEST,
  moduleChildPaths,
} from './legacy-navigation.manifest';

describe('legacy navigation manifest', () => {
  it('contains one section per major module', () => {
    const moduleKeys = LEGACY_NAVIGATION_MANIFEST.map((section) => section.moduleKey);

    expect(moduleKeys).toEqual([
      'gestao',
      'rh',
      'folha',
      'avaliacao',
      'recrutamento',
      'consultas',
      'relatorios',
      'previdenciario',
      'auditoria',
      'saude',
      'convenio',
    ]);
  });

  it('maps documented admin menu routes to modern route paths', () => {
    const gestaoSection = LEGACY_NAVIGATION_MANIFEST.find(
      (section) => section.moduleKey === 'gestao',
    );
    const bancos = gestaoSection?.items.find((item) => item.label === 'Banco');

    expect(bancos?.routePath).toBe('/gestao/banco/gestao');
  });

  it('keeps module route catalogs available for route-group generation', () => {
    expect(LEGACY_MODULE_ROUTES['folha'].length).toBeGreaterThan(0);
    expect(moduleChildPaths('convenio')).toContain('beneficiario/gestao');
  });
});
