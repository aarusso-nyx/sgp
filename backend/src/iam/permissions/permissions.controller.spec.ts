import { PermissionsController } from './permissions.controller';

describe('PermissionsController', () => {
  it('lists runtime permissions', () => {
    const listPermissions = jest.fn().mockReturnValue(['auth.read']);
    const controller = new PermissionsController({
      listPermissions,
    } as never);

    const result = controller.listPermissions();

    expect(listPermissions).toHaveBeenCalled();
    expect(result).toEqual(['auth.read']);
  });
});
