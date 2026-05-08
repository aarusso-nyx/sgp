import { permissionGuard } from '../auth/permission-guard';
import { buildModuleRouteGroup } from './module-route-groups';

class TestAdminPage {}

describe('buildModuleRouteGroup', () => {
  it('generates guarded route links for the installed Auditoria menu slice', () => {
    const routes = buildModuleRouteGroup('auditoria', TestAdminPage, {
      moduleLabel: 'Auditoria',
    });
    const auditTrailRoute = routes.find((route) => route.path === 'trilha/gestao');
    const auditDetailRoute = routes.find((route) => route.path === 'trilha/detalhes/:id');

    expect(routes[0]).toEqual(
      expect.objectContaining({
        path: '',
        canActivate: [permissionGuard],
      }),
    );
    expect(auditTrailRoute).toEqual(
      expect.objectContaining({
        canActivate: [permissionGuard],
        data: expect.objectContaining({
          featureRoutePath: '/auditoria/trilha/gestao',
          legacyChildPath: 'trilha/gestao',
          moduleKey: 'auditoria',
          permissions: ['auditoria.read'],
          requiredRole: 'AUDITORIA.GESTAO',
        }),
      }),
    );
    expect(auditDetailRoute?.data?.['featureRoutePath']).toBe('/auditoria/trilha/detalhes/:id');
  });
});
