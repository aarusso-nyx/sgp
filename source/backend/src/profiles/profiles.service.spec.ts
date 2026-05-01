import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  const profileRow = {
    id: 'profile-1',
    code: 'ADMIN',
    name: 'Administradores',
    description: 'Perfil administrativo',
    status: 'ACTIVE',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: '2026-01-02T00:00:00.000Z',
  };

  const createQuery = () =>
    jest.fn(async (sql: string) => {
      if (sql.includes('count(*)::text AS total')) {
        return [{ total: '1' }];
      }
      if (sql.includes('SELECT p.key')) {
        return [{ key: 'rh.read' }, { key: 'rh.write' }];
      }
      if (sql.includes('public.access_profile')) {
        return [profileRow];
      }
      return [];
    });

  it('lists, reads, mutates, and assigns profile permissions', async () => {
    const query = createQuery();
    const service = new ProfilesService({
      configured: true,
      query,
    } as never);

    await expect(
      service.list({ page: 1, pageSize: 10, search: 'admin' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        {
          code: 'ADMIN',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
    await expect(service.getById('profile-1')).resolves.toMatchObject({
      code: 'ADMIN',
      papeis: ['rh.read', 'rh.write'],
    });
    await expect(
      service.create({
        code: ' ADMIN ',
        name: ' Administradores ',
        description: ' Perfil administrativo ',
      }),
    ).resolves.toMatchObject({ code: 'ADMIN' });
    await expect(
      service.update('profile-1', {
        name: 'Administradores atualizados',
        description: 'Atualizado',
      }),
    ).resolves.toMatchObject({ id: 'profile-1' });
    await expect(service.deactivate('profile-1')).resolves.toMatchObject({
      status: 'ACTIVE',
    });
    await expect(
      service.setPermissions('profile-1', { papeis: ['rh.read', 'rh.write'] }),
    ).resolves.toMatchObject({
      papeis: ['rh.read', 'rh.write'],
    });
    await expect(
      service.setPermissions('profile-1', { papeis: [] }),
    ).resolves.toMatchObject({
      code: 'ADMIN',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.profile_permission'),
      ['profile-1', ['rh.read', 'rh.write']],
    );
  });

  it('rejects unavailable databases, duplicates, and missing profiles', async () => {
    await expect(
      new ProfilesService({ configured: false } as never).list({}),
    ).rejects.toThrow('DATABASE_URL is required');
    await expect(
      new ProfilesService({
        configured: true,
        query: jest.fn(async () => {
          throw { code: '23505' };
        }),
      } as never).create({
        code: 'ADMIN',
        name: 'Administradores',
      }),
    ).rejects.toThrow('Profile code already exists');
    await expect(
      new ProfilesService({
        configured: true,
        query: jest.fn(async () => []),
      } as never).getById('missing'),
    ).rejects.toThrow('Profile not found');
    await expect(
      new ProfilesService({
        configured: true,
        query: jest.fn(async () => []),
      } as never).update('missing', {}),
    ).rejects.toThrow('Profile not found');
    await expect(
      new ProfilesService({
        configured: true,
        query: jest.fn(async () => [{ total: '0' }]),
      } as never).setPermissions('missing', { papeis: [] }),
    ).rejects.toThrow('Profile not found');
  });
});
