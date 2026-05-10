import { NavigationFilter } from './navigation-filter';

describe('NavigationFilter', () => {
  const service = new NavigationFilter();

  it('allows items without requirements for anonymous sessions', () => {
    expect(service.canAccess({}, null)).toBe(true);
  });

  it('blocks permission-scoped items when permission is missing', () => {
    const session = {
      subject: '1',
      login: 'analista',
      displayName: 'Analista',
      groups: ['rh'],
      permissions: ['gestao.listar'],
    };

    expect(service.canAccess({ requiredPermissions: ['gestao.editar'] }, session)).toBe(false);
  });

  it('allows access only when all permissions and groups are present', () => {
    const session = {
      subject: '1',
      login: 'gestor',
      displayName: 'Gestor',
      groups: ['rh', 'gestao'],
      permissions: ['gestao.listar', 'gestao.editar'],
    };

    expect(
      service.canAccess(
        {
          requiredPermissions: ['gestao.listar', 'gestao.editar'],
          requiredGroups: ['gestao'],
        },
        session,
      ),
    ).toBe(true);
  });

  it('returns menu sections with only visible items', () => {
    const session = {
      subject: '1',
      login: 'auditor',
      displayName: 'Auditor',
      groups: [],
      permissions: [],
    };

    const sections = service.visibleSections(session);

    expect(sections.length).toBeGreaterThan(0);
    expect(sections.every((section) => section.items.length > 0)).toBe(true);
  });

  it('filters the installed Auditoria menu group by permission', () => {
    const blockedSession = {
      subject: '1',
      login: 'operador',
      displayName: 'Operador',
      groups: [],
      permissions: [],
    };
    const allowedSession = {
      ...blockedSession,
      permissions: ['auditoria.read'],
    };

    expect(
      service.visibleSections(blockedSession).some((section) => section.moduleKey === 'auditoria'),
    ).toBe(false);
    expect(
      service
        .visibleSections(allowedSession)
        .find((section) => section.moduleKey === 'auditoria')
        ?.items.map((item) => item.routePath),
    ).toEqual([
      '/auditoria/trilha/gestao',
      '/auditoria/trilha/detalhes/:id',
      '/auditoria/relatorio/gestao',
      '/auditoria/entidade/gestao',
      '/auditoria/usuario/gestao',
      '/auditoria/periodo/gestao',
    ]);
  });
});
