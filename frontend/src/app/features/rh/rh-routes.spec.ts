import { Route } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission-guard';
import { rhRoutes } from './rh-routing-module';

const expectedPermissionsByPath = new Map<string, string[]>([
  ['funcionarios', ['rh.employee.read']],
  ['funcionarios/:id/vinculos', ['rh.employment_link.write']],
  ['funcionarios/:id/historico', ['rh.history.read']],
  ['funcionarios/:id/abono-permanencia', ['rh.employee.abono.write']],
  ['funcionarios/:id/dados-bancarios', ['hr.bank_account.read']],
  ['funcionarios/:id/pensao-alimenticia', ['hr.alimony.read']],
  ['funcionarios/vinculos', ['rh.employment_link.write']],
  ['cadastral-changes', ['rh.cadastral_change.approve']],
  ['ferias', ['rh.vacation.read']],
  ['licencas', ['rh.leave.read']],
  ['transferencia/gestao', ['rh.movimentacao.read']],
  ['reintegracao', ['rh.employee.write']],
  ['portal/transferencias', ['rh.movimentacao.request']],
  ['tsv-contratos', ['hr.employment.read']],
]);

describe('rhRoutes', () => {
  it('guards every explicit RH feature route with catalog permissions', () => {
    for (const [path, permissions] of expectedPermissionsByPath) {
      const route = routeByPath(path);

      expect(route.canActivate).toContain(permissionGuard);
      expect(route.data?.['permissions']).toEqual(permissions);
    }
  });

  it('keeps every non-redirect explicit RH feature route guarded', () => {
    const explicitFeatureRoutes = Array.from(expectedPermissionsByPath.keys()).map((path) =>
      routeByPath(path),
    );

    expect(explicitFeatureRoutes).toHaveLength(expectedPermissionsByPath.size);
    expect(
      explicitFeatureRoutes.every((route) => route.canActivate?.includes(permissionGuard)),
    ).toBe(true);
    expect(
      explicitFeatureRoutes.every((route) => {
        const permissions = route.data?.['permissions'];
        return Array.isArray(permissions) && permissions.length > 0;
      }),
    ).toBe(true);
  });
});

function routeByPath(path: string): Route {
  const route = rhRoutes.find((candidate) => candidate.path === path);
  if (!route) {
    throw new Error(`Missing RH route ${path}`);
  }
  return route;
}
