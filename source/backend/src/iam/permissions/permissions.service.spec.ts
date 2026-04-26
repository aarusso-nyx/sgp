import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  it('maps groups to permission set', () => {
    const service = new PermissionsService();
    const permissions = service.permissionsForGroups(['sgp_rh']);

    expect(permissions).toEqual(
      expect.arrayContaining(['auth:read', 'rh:read', 'rh:write']),
    );
  });
});
