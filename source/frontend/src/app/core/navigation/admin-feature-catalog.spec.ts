import {
  ADMIN_FEATURES,
  ADMIN_NAVIGATION_SECTIONS,
  findAdminFeatureByRoutePath,
} from './admin-feature-catalog';

describe('admin feature catalog', () => {
  it('covers every documented sgp-admin route from the menu spec', () => {
    expect(ADMIN_FEATURES.length).toBe(189);
    expect(ADMIN_NAVIGATION_SECTIONS.length).toBe(13);
    expect(ADMIN_NAVIGATION_SECTIONS.every((section) => section.items.length > 0)).toBe(true);
  });

  it('keeps postponed non-admin domains out of the frontend catalog', () => {
    const routes = ADMIN_FEATURES.map((feature) => feature.routePath.toLowerCase());

    expect(routes.some((route) => route.includes('colare'))).toBe(false);
    expect(routes.some((route) => route.includes('arrecadacao'))).toBe(false);
  });

  it('finds canonical route templates with parameters', () => {
    expect(
      findAdminFeatureByRoutePath('/previdenciario/regra-aposentadoria/formulario/:id')?.label,
    ).toBe('Regra — editar');
  });
});
