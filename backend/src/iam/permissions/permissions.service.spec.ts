import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  const databaseService = {
    query: jest
      .fn()
      .mockResolvedValue([
        { key: 'auth.read' },
        { key: 'rh.read' },
        { key: 'rh.write' },
      ]),
  };

  it('maps groups to permission set from database profiles', async () => {
    const service = new PermissionsService(databaseService as never);
    const permissions = await service.permissionsForGroups(
      ['sgp_rh'],
      '00000000-0000-0000-0000-000000000100',
    );

    expect(permissions).toEqual(
      expect.arrayContaining(['auth.read', 'rh.read', 'rh.write']),
    );
    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringContaining('public.access_profile'),
      [['RH']],
    );
  });
});
