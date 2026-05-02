import { InvitesService } from './invites.service';

describe('InvitesService', () => {
  it('creates invitations with provided identity and expiration details', () => {
    const service = new InvitesService();

    const result = service.createInvite({
      email: 'user@example.test',
      login: 'user.login',
      perfis: ['admin'],
      expiresAt: '2026-05-01T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      status: 'PENDING',
      email: 'user@example.test',
      login: 'user.login',
      perfis: ['admin'],
      expiresAt: '2026-05-01T00:00:00.000Z',
    });
    expect(result.id).toHaveLength(36);
    expect(result.token).toHaveLength(36);
  });

  it('uses nullable defaults for optional invitation fields', () => {
    const result = new InvitesService().createInvite({});

    expect(result).toMatchObject({
      status: 'PENDING',
      email: null,
      login: null,
      perfis: [],
    });
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('cancels and accepts invitations', () => {
    const service = new InvitesService();

    expect(service.cancelInvite('invite-1')).toMatchObject({
      id: 'invite-1',
      status: 'CANCELED',
    });
    expect(
      service.acceptInvite('token-1', { nome: 'Maria', senha: 'changed' }),
    ).toMatchObject({
      token: 'token-1',
      status: 'ACCEPTED',
      nome: 'Maria',
      senhaDefinida: true,
    });
    expect(service.acceptInvite('token-2', {})).toMatchObject({
      nome: null,
      senhaDefinida: false,
    });
  });
});
