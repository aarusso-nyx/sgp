import { SessionService } from './session.service';

describe('SessionService', () => {
  const actor = {
    sub: 's1',
    username: 'u1',
    tenantId: '00000000-0000-0000-0000-000000000100',
    groups: [],
    permissions: [],
  };

  it('returns authentication state', () => {
    const service = new SessionService();

    expect(service.currentSession(undefined).authenticated).toBe(false);
    expect(service.currentSession(actor).authenticated).toBe(true);
  });

  it('returns menu, logout, and password flow responses', () => {
    const service = new SessionService();

    expect(service.currentMenus(actor)).toMatchObject({
      actor: 'u1',
      items: expect.arrayContaining([
        expect.objectContaining({ id: 'dashboard' }),
      ]),
    });
    expect(service.currentMenus(undefined).actor).toBeNull();
    expect(service.logout(actor)).toMatchObject({
      actor: 'u1',
      loggedOut: true,
    });
    expect(service.logout(undefined).actor).toBeNull();
    expect(service.recoverPassword({ login: 'u1' }).identifier).toBe('u1');
    expect(
      service.recoverPassword({ email: 'u1@example.test' }).identifier,
    ).toBe('u1@example.test');
    expect(service.recoverPassword({}).identifier).toBeNull();
    expect(
      service.confirmNewPassword({ token: 'token', novaSenha: 'changed' })
        .accepted,
    ).toBe(true);
    expect(
      service.confirmNewPassword({ token: '', novaSenha: '' }).accepted,
    ).toBe(false);
    expect(
      service.changePassword(actor, {
        senhaAtual: 'current',
        novaSenha: 'changed',
      }).changed,
    ).toBe(true);
    expect(
      service.changePassword(undefined, { senhaAtual: '', novaSenha: '' }),
    ).toMatchObject({ actor: null, changed: false });
  });
});
