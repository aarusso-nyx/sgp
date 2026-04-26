import { UsersService } from './users.service';

describe('UsersService', () => {
  const userRow = {
    id: 'user-1',
    login: 'maria',
    name: 'Maria Servidora',
    email: 'maria@example.test',
    cpf: '00011122233',
    status: 'ACTIVE',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: '2026-01-02T00:00:00.000Z',
    profile_codes: ['ADMIN'],
  };
  const profileRow = {
    id: 'profile-1',
    code: 'ADMIN',
    name: 'Administradores',
  };

  const createQuery = () =>
    jest.fn(async (sql: string) => {
      if (sql.includes('count(*)::text AS total')) {
        return [{ total: '1' }];
      }
      if (sql.includes('SELECT ap.id::text, ap.code, ap.name')) {
        return [profileRow];
      }
      if (sql.includes('public.user_account')) {
        return [userRow];
      }
      return [];
    });

  it('lists, creates, updates, and assigns user access data', async () => {
    const query = createQuery();
    const service = new UsersService({
      configured: true,
      query,
    } as never);

    await expect(
      service.list({
        page: 1,
        pageSize: 10,
        search: 'Maria',
        status: 'ACTIVE',
        profileId: 'profile-1',
      }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        {
          login: 'maria',
          profileCodes: ['ADMIN'],
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
    await expect(
      service.create({
        login: ' maria ',
        name: ' Maria Servidora ',
        email: ' MARIA@EXAMPLE.TEST ',
        cpf: ' 00011122233 ',
        cognitoSub: ' cognito-sub ',
        status: 'ACTIVE',
      }),
    ).resolves.toMatchObject({ login: 'maria' });
    await expect(
      service.update('user-1', {
        name: 'Maria Atualizada',
        email: 'maria.atualizada@example.test',
        status: 'INACTIVE',
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(
      service.assignProfiles('user-1', { perfis: ['profile-1'] }),
    ).resolves.toEqual({
      userId: 'user-1',
      profiles: [{ id: 'profile-1', code: 'ADMIN', name: 'Administradores' }],
    });
    await expect(
      service.assignDirectRoles('user-1', { papeis: ['rh:read', 'rh:write'] }),
    ).resolves.toMatchObject({
      userId: 'user-1',
      papeis: ['rh:read', 'rh:write'],
    });
    await expect(
      service.assignProfiles('user-1', { perfis: [] }),
    ).resolves.toMatchObject({ userId: 'user-1' });
    await expect(
      service.assignDirectRoles('user-1', { papeis: [] }),
    ).resolves.toMatchObject({ papeis: [] });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.user_group_snapshot'),
      ['user-1', ['rh:read', 'rh:write']],
    );
  });

  it('rejects unavailable databases, duplicates, and missing users', async () => {
    await expect(
      new UsersService({ configured: false } as never).list({}),
    ).rejects.toThrow('DATABASE_URL is required');
    await expect(
      new UsersService({
        configured: true,
        query: jest.fn(async () => {
          throw { code: '23505' };
        }),
      } as never).create({
        login: 'maria',
        name: 'Maria Servidora',
      }),
    ).rejects.toThrow('same login');
    await expect(
      new UsersService({
        configured: true,
        query: jest.fn(async () => []),
      } as never).update('missing', {}),
    ).rejects.toThrow('User not found');
    await expect(
      new UsersService({
        configured: true,
        query: jest.fn(async () => [{ total: '0' }]),
      } as never).assignProfiles('missing', { perfis: [] }),
    ).rejects.toThrow('User not found');
  });
});
